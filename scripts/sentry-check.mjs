import { execFileSync } from 'node:child_process';

const SENTRY_API = 'https://sentry.io/api/0';
const MAX_ISSUES_PER_RUN = 3;

const safe = (s, max = 200) =>
  String(s ?? '').replace(/[\n\r]/g, ' ').slice(0, max);

export async function fetchSentryIssues(org, project, token) {
  const url = `${SENTRY_API}/projects/${org}/${project}/issues/?query=is:unresolved&environment=production&sort=date&limit=25`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new Error(`Sentry API ${res.status}: ${body}`);
  }
  return res.json();
}

export function filterActionable(issues) {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return issues.filter(issue => {
    const isNew = new Date(issue.firstSeen).getTime() > oneDayAgo;
    const isEscalating = Number(issue.count) >= 5 && issue.status === 'unresolved';
    return isNew || isEscalating;
  });
}

export function hasOpenPR(issueId) {
  try {
    const result = execFileSync(
      'gh',
      ['pr', 'list', '--state', 'open', '--search', `[SENTRY-${issueId}]`, '--json', 'number'],
      { encoding: 'utf8' }
    );
    return JSON.parse(result).length > 0;
  } catch (err) {
    throw new Error(`gh CLI falló para SENTRY-${issueId}: ${err.message}`);
  }
}

export function buildPrompt(issue, sentryOrg) {
  const frame = safe(issue.culprit || '(archivo desconocido)');
  const stackTrace = issue.entries
    ?.find(e => e.type === 'exception')
    ?.data?.values?.[0]?.stacktrace?.frames
    ?.slice(-5)
    ?.map(f => `  at ${safe(f.function || '?', 100)} (${safe(f.filename, 150)}:${f.lineNo})`)
    ?.join('\n') ?? '(stack trace no disponible)';

  return `Eres un agente de fix automático del portal AFUSAMUT (vanilla JS + Firebase Hosting).

Error detectado en Sentry (producción):
- ID: ${safe(issue.id, 50)}
- Título: ${safe(issue.title)}
- Archivo: ${frame}
- Ocurrencias: ${safe(issue.count, 20)} | Primera vez: ${safe(issue.firstSeen, 30)}
- Stack trace:
${stackTrace}

Instrucciones:
1. Lee el archivo afectado (busca en public/js/, firestore.rules, storage.rules)
2. Identifica la causa raíz del error
3. Aplica el fix mínimo necesario — no refactorices ni amplíes scope
4. Crea el branch: claude/fix-SENTRY-${safe(issue.id, 50)}
5. Haz commit con mensaje: "fix: [describe el fix] [SENTRY-${safe(issue.id, 50)}]"
6. Abre un PR con título: "[SENTRY-${safe(issue.id, 50)}] fix: [descripción corta]"
   El body del PR debe incluir:
   - Causa raíz identificada
   - Cambio aplicado
   - Link al issue: https://sentry.io/organizations/${safe(sentryOrg, 50)}/issues/${safe(issue.id, 50)}/`;
}

export function runClaudeOnIssue(prompt) {
  execFileSync('claude', ['-p', prompt, '--dangerously-skip-permissions'], {
    stdio: 'inherit',
    encoding: 'utf8',
  });
}

async function main() {
  const { SENTRY_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env;
  if (!SENTRY_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) {
    throw new Error('Faltan variables de entorno: SENTRY_TOKEN, SENTRY_ORG, SENTRY_PROJECT');
  }

  const issues = await fetchSentryIssues(SENTRY_ORG, SENTRY_PROJECT, SENTRY_TOKEN);
  const actionable = filterActionable(issues);
  console.log(`Sentry: ${issues.length} issues totales, ${actionable.length} accionables`);

  let processed = 0;
  for (const issue of actionable) {
    if (processed >= MAX_ISSUES_PER_RUN) {
      console.log(`Límite de ${MAX_ISSUES_PER_RUN} issues por ejecución alcanzado.`);
      break;
    }
    if (hasOpenPR(issue.id)) {
      console.log(`Skip SENTRY-${issue.id}: ya existe PR abierto.`);
      continue;
    }
    console.log(`Procesando SENTRY-${issue.id}: ${issue.title}`);
    const prompt = buildPrompt(issue, SENTRY_ORG);
    try {
      runClaudeOnIssue(prompt);
      processed++;
    } catch (err) {
      console.error(`Error procesando SENTRY-${issue.id}:`, err.message);
    }
  }

  console.log(`Listo. ${processed} issue(s) procesados.`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(() => process.exit(0));
}
