# Sentry Autofix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada 30 minutos, un workflow de GitHub Actions consulta Sentry, detecta errores nuevos o escalando, y lanza Claude Code para que analice el código y abra un PR con el fix propuesto.

**Architecture:** Un script ESM (`scripts/sentry-check.mjs`) contiene toda la lógica: polling de la Sentry API, deduplicación via búsqueda de PRs abiertos, construcción del prompt, e invocación de Claude Code via `execFileSync`. El workflow de GitHub Actions lo corre en cron cada 30 minutos.

**Tech Stack:** Node.js 20 ESM, `node:test` (tests built-in), `node:child_process` execFileSync, GitHub CLI (`gh`), Claude Code CLI (`claude`), Sentry REST API v0.

---

## File Map

| Archivo | Estado | Responsabilidad |
|---|---|---|
| `scripts/sentry-check.mjs` | Crear | Polling, filtrado, dedup, prompt, invocación Claude |
| `scripts/sentry-check.test.mjs` | Crear | Tests unitarios de funciones puras |
| `.github/workflows/sentry-autofix.yml` | Crear | Cron job, instalación deps, ejecución del script |

---

## Task 1: Sentry API polling y filtrado de issues

**Files:**
- Create: `scripts/sentry-check.mjs`
- Create: `scripts/sentry-check.test.mjs`

- [ ] **Step 1: Crear el script base con fetch de Sentry y filtrado**

Crear `scripts/sentry-check.mjs`:

```javascript
import { execFileSync } from 'node:child_process';

const SENTRY_API = 'https://sentry.io/api/0';
const MAX_ISSUES_PER_RUN = 3;

export async function fetchSentryIssues(org, project, token) {
  const url = `${SENTRY_API}/projects/${org}/${project}/issues/?query=is:unresolved&environment=production&sort=date&limit=25`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sentry API ${res.status}: ${await res.text()}`);
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
  } catch {
    return false;
  }
}

export function buildPrompt(issue, sentryOrg) {
  const frame = issue.culprit || '(archivo desconocido)';
  const stackTrace = issue.entries
    ?.find(e => e.type === 'exception')
    ?.data?.values?.[0]?.stacktrace?.frames
    ?.slice(-5)
    ?.map(f => `  at ${f.function || '?'} (${f.filename}:${f.lineNo})`)
    ?.join('\n') ?? '(stack trace no disponible)';

  return `Eres un agente de fix automático del portal AFUSAMUT (vanilla JS + Firebase Hosting).

Error detectado en Sentry (producción):
- ID: ${issue.id}
- Título: ${issue.title}
- Archivo: ${frame}
- Ocurrencias: ${issue.count} | Primera vez: ${issue.firstSeen}
- Stack trace:
${stackTrace}

Instrucciones:
1. Lee el archivo afectado (busca en public/js/, firestore.rules, storage.rules)
2. Identifica la causa raíz del error
3. Aplica el fix mínimo necesario — no refactorices ni amplíes scope
4. Crea el branch: claude/fix-SENTRY-${issue.id}
5. Haz commit con mensaje: "fix: [describe el fix] [SENTRY-${issue.id}]"
6. Abre un PR con título: "[SENTRY-${issue.id}] fix: [descripción corta]"
   El body del PR debe incluir:
   - Causa raíz identificada
   - Cambio aplicado
   - Link al issue: https://sentry.io/organizations/${sentryOrg}/issues/${issue.id}/`;
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
    runClaudeOnIssue(prompt);
    processed++;
  }

  console.log(`Listo. ${processed} issue(s) procesados.`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(e => {
    // Sentry API o red fallaron → logear pero salir con 0 para no generar alerta de CI
    console.warn(`[sentry-autofix] advertencia: ${e.message}`);
    process.exit(0);
  });
}
```

- [ ] **Step 2: Crear tests unitarios**

Crear `scripts/sentry-check.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterActionable, buildPrompt } from './sentry-check.mjs';

const NOW = Date.now();
const RECENT = new Date(NOW - 1 * 60 * 60 * 1000).toISOString();  // 1h ago
const OLD    = new Date(NOW - 48 * 60 * 60 * 1000).toISOString(); // 48h ago

test('filterActionable — incluye issue nuevo (< 24h)', () => {
  const issues = [{ id: '1', firstSeen: RECENT, count: '1', status: 'unresolved' }];
  assert.equal(filterActionable(issues).length, 1);
});

test('filterActionable — incluye issue escalando (count >= 5, unresolved)', () => {
  const issues = [{ id: '2', firstSeen: OLD, count: '10', status: 'unresolved' }];
  assert.equal(filterActionable(issues).length, 1);
});

test('filterActionable — excluye issue viejo sin escalar', () => {
  const issues = [{ id: '3', firstSeen: OLD, count: '2', status: 'unresolved' }];
  assert.equal(filterActionable(issues).length, 0);
});

test('filterActionable — excluye issue resolved aunque count sea alto', () => {
  const issues = [{ id: '4', firstSeen: OLD, count: '100', status: 'resolved' }];
  assert.equal(filterActionable(issues).length, 0);
});

test('filterActionable — count exactamente 5 es escalando', () => {
  const issues = [{ id: '5', firstSeen: OLD, count: '5', status: 'unresolved' }];
  assert.equal(filterActionable(issues).length, 1);
});

test('buildPrompt — contiene ID, título, branch y link de Sentry', () => {
  const issue = {
    id: 'abc123',
    title: 'TypeError: x is undefined',
    culprit: 'public/js/portal.js:42',
    count: '7',
    firstSeen: RECENT,
    entries: [],
  };
  const prompt = buildPrompt(issue, 'afusamut');
  assert.ok(prompt.includes('SENTRY-abc123'), 'debe incluir ID');
  assert.ok(prompt.includes('TypeError: x is undefined'), 'debe incluir título');
  assert.ok(prompt.includes('claude/fix-SENTRY-abc123'), 'debe incluir nombre de branch');
  assert.ok(prompt.includes('sentry.io/organizations/afusamut/issues/abc123'), 'debe incluir link');
});

test('buildPrompt — maneja entries vacíos sin stack trace', () => {
  const issue = {
    id: 'xyz',
    title: 'Error sin stack',
    culprit: '',
    count: '3',
    firstSeen: RECENT,
    entries: [],
  };
  const prompt = buildPrompt(issue, 'afusamut');
  assert.ok(prompt.includes('stack trace no disponible'));
});
```

- [ ] **Step 3: Correr los tests**

```bash
node --test scripts/sentry-check.test.mjs
```

Salida esperada:
```
✔ filterActionable — incluye issue nuevo (< 24h)
✔ filterActionable — incluye issue escalando (count >= 5, unresolved)
✔ filterActionable — excluye issue viejo sin escalar
✔ filterActionable — excluye issue resolved aunque count sea alto
✔ filterActionable — count exactamente 5 es escalando
✔ buildPrompt — contiene ID, título, branch y link de Sentry
✔ buildPrompt — maneja entries vacíos sin stack trace
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

- [ ] **Step 4: Commit**

```bash
git add scripts/sentry-check.mjs scripts/sentry-check.test.mjs
git commit -m "feat(sentry-autofix): script de polling, filtrado y prompt builder"
```

---

## Task 2: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/sentry-autofix.yml`

- [ ] **Step 1: Crear el workflow**

Crear `.github/workflows/sentry-autofix.yml`:

```yaml
name: Sentry Autofix

on:
  schedule:
    - cron: '*/30 * * * *'  # cada 30 minutos
  workflow_dispatch:          # disparo manual para pruebas

permissions:
  contents: write
  pull-requests: write

jobs:
  autofix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4

      - name: Setup Node.js
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020  # v4
        with:
          node-version: '20'

      - name: Configure git identity
        run: |
          git config user.email "sentry-autofix[bot]@afusamut"
          git config user.name "Sentry Autofix"

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Run Sentry check
        env:
          SENTRY_TOKEN: ${{ secrets.SENTRY_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/sentry-check.mjs
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/sentry-autofix.yml
git commit -m "feat(sentry-autofix): workflow cron en GitHub Actions"
```

---

## Task 3: Agregar secrets en GitHub

**Files:** Ninguno (configuración en GitHub.com)

- [ ] **Step 1: Obtener el Sentry token**

1. Ir a [sentry.io](https://sentry.io) → Settings → Developer Settings → **User Auth Tokens**
2. Crear nuevo token con scopes: `project:read`, `event:read`
3. Copiar el token

- [ ] **Step 2: Obtener org slug y project slug de Sentry**

- **Org slug:** Sentry → Settings → Organization → campo "Organization Slug"
- **Project slug:** Sentry → Projects → nombre del proyecto (ej: `afusamut-portal` o `javascript`)

- [ ] **Step 3: Agregar los secrets via CLI**

```bash
gh secret set SENTRY_TOKEN --repo aldomellado1310-source/afusamut
# (pegar el token cuando lo pida)

gh secret set SENTRY_ORG --repo aldomellado1310-source/afusamut
# (pegar el org slug, ej: afusamut)

gh secret set SENTRY_PROJECT --repo aldomellado1310-source/afusamut
# (pegar el project slug, ej: javascript)

gh secret set ANTHROPIC_API_KEY --repo aldomellado1310-source/afusamut
# (pegar la API key de Anthropic)
```

- [ ] **Step 4: Verificar que los 4 secrets estén configurados**

```bash
gh secret list --repo aldomellado1310-source/afusamut
```

Salida esperada (los valores no se muestran, solo los nombres):
```
ANTHROPIC_API_KEY     ...
FIREBASE_SERVICE_ACCOUNT ...
SENTRY_ORG            ...
SENTRY_PROJECT        ...
SENTRY_TOKEN          ...
```

---

## Task 4: Push y smoke test manual

**Files:** Ninguno (operaciones git/gh)

- [ ] **Step 1: Push de la rama y abrir PR**

```bash
git push origin feat/preasignacion-roles
gh pr create --title "feat(sentry-autofix): pipeline Sentry → Claude → PR automático" \
  --body "Implementa el workflow de autofix descripto en docs/superpowers/specs/2026-06-14-sentry-autofix-design.md"
```

- [ ] **Step 2: Disparar el workflow manualmente**

```bash
gh workflow run sentry-autofix.yml --repo aldomellado1310-source/afusamut
```

- [ ] **Step 3: Monitorear la ejecución**

```bash
gh run list --workflow=sentry-autofix.yml --limit 1
# Copiar el run ID y:
gh run watch <RUN_ID>
```

Salida esperada en el log del paso "Run Sentry check":
```
Sentry: 25 issues totales, N accionables
(Skip o "Procesando SENTRY-xxx: ..." según el estado actual de Sentry)
Listo. N issue(s) procesados.
```

- [ ] **Step 4: Si se creó un PR de fix, verificarlo**

```bash
gh pr list --search "SENTRY-" --state open
```

Abrir el PR generado y verificar que:
- El título sigue el formato `[SENTRY-{id}] fix: {descripción}`
- El body incluye causa raíz, cambio aplicado y link a Sentry
- El branch es `claude/fix-SENTRY-{id}`
