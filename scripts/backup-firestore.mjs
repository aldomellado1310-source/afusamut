// Respaldo completo de Firestore a JSON local (Admin SDK).
// El padrón, las actas y las finanzas tienen valor legal (Ley 19.296):
// este script permite un respaldo periódico sin depender del plan Blaze.
// Uso: node scripts/backup-firestore.mjs
//      (programable con el Programador de tareas de Windows o cron)
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serviceAccount = JSON.parse(readFileSync(join(root, 'serviceAccountKey.json'), 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

// Timestamps → ISO 8601 para que el JSON sea legible y re-importable
function serializar(valor) {
  if (valor instanceof Timestamp) return { __timestamp: valor.toDate().toISOString() };
  if (Array.isArray(valor)) return valor.map(serializar);
  if (valor && typeof valor === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(valor)) out[k] = serializar(v);
    return out;
  }
  return valor;
}

const colecciones = await db.listCollections();
const dump = {};
let totalDocs = 0;

for (const col of colecciones) {
  const snap = await col.get();
  dump[col.id] = {};
  snap.forEach((d) => { dump[col.id][d.id] = serializar(d.data()); });
  totalDocs += snap.size;
  console.log(`  ${col.id}: ${snap.size} documentos`);
}

const dir = join(root, 'backups');
mkdirSync(dir, { recursive: true });
const fecha = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
const archivo = join(dir, `AFUSAMUT_firestore_${fecha}.json`);
writeFileSync(archivo, JSON.stringify({
  proyecto: serviceAccount.project_id,
  generadoEn: new Date().toISOString(),
  colecciones: dump,
}, null, 2));

console.log(`\n✅ Respaldo completo: ${colecciones.length} colecciones, ${totalDocs} documentos`);
console.log(`   ${archivo}`);
console.log('⚠️  El archivo contiene datos personales del padrón: guárdalo en un lugar seguro y NO lo subas a git (backups/ está ignorado).');
