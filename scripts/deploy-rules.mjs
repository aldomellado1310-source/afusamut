/**
 * Despliega firestore.rules y storage.rules vía Firebase Rules REST API.
 * Uso: node scripts/deploy-rules.mjs
 * Requiere: GOOGLE_APPLICATION_CREDENTIALS apuntando al service account key.
 */
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECT = 'afusamuth';
const BASE = `https://firebaserules.googleapis.com/v1/projects/${PROJECT}`;

async function getToken() {
  const auth = new GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

async function apiFetch(url, method, body, token) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${url} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function deployRuleset(token, files, releaseName) {
  // 1. Crear un nuevo ruleset
  const ruleset = await apiFetch(`${BASE}/rulesets`, 'POST', { source: { files } }, token);
  const rulesetName = ruleset.name; // projects/afusamuth/rulesets/<id>
  console.log(`  Ruleset creado: ${rulesetName}`);

  // 2. Actualizar el release para apuntar al nuevo ruleset
  await apiFetch(
    `${BASE}/releases/${encodeURIComponent(releaseName)}`,
    'PATCH',
    { release: { name: `projects/${PROJECT}/releases/${releaseName}`, rulesetName } },
    token,
  );
  console.log(`  Release '${releaseName}' actualizado ✓`);
}

async function main() {
  console.log('Obteniendo token de servicio…');
  const token = await getToken();

  console.log('\n[1/2] Deploying firestore.rules…');
  const firestoreSource = readFileSync(join(ROOT, 'firestore.rules'), 'utf8');
  await deployRuleset(
    token,
    [{ name: 'firestore.rules', content: firestoreSource }],
    'cloud.firestore',
  );

  console.log('\n[2/2] Deploying storage.rules…');
  const storageSource = readFileSync(join(ROOT, 'storage.rules'), 'utf8');
  await deployRuleset(
    token,
    [{ name: 'storage.rules', content: storageSource }],
    'firebase.storage/afusamuth.firebasestorage.app',
  );

  console.log('\n✓ Reglas desplegadas correctamente.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
