// Siembra config/cuotas en Firestore (Admin SDK) — ejecutar una vez.
// Idempotente: si el doc ya existe, no lo pisa (usar el panel del portal para editar).
// Uso: node scripts/seed-cuotas.mjs [--force]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serviceAccount = JSON.parse(readFileSync(join(root, 'serviceAccountKey.json'), 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const ref = db.doc('config/cuotas');
const snap = await ref.get();

if (snap.exists && !process.argv.includes('--force')) {
  console.log('config/cuotas ya existe — sin cambios (usa --force para sobrescribir).');
  console.log(JSON.stringify(snap.data().categorias, null, 2));
  process.exit(0);
}

await ref.set({
  categorias: [
    {
      id: 'tecnico',
      nombre: 'Personal Técnico',
      estamentos: ['TENS', 'Conductor/a', 'Auxiliar', 'Técnico/a', 'Administrativo/a'],
      montoCLP: 5000,
    },
    {
      id: 'profesional',
      nombre: 'Personal Profesional',
      estamentos: ['Reanimador/a', 'Médico/a', 'Enfermero/a', 'Paramédico/a', 'Kinesiólogo/a'],
      montoCLP: 10000,
    },
  ],
  actualizadoPor: 'sistema',
  actualizadoEn: FieldValue.serverTimestamp(),
});
console.log('✅ Cuotas configuradas: Técnico $5.000 · Profesional $10.000');
process.exit(0);
