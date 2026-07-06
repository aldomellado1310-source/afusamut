/**
 * Carga masiva de socios a padronPendiente desde scripts/padron-data.json.
 * Idempotente: si el doc ya existe lo omite (no sobreescribe).
 * Uso: node scripts/seed-padron.mjs [--force]
 *   --force  sobreescribe docs existentes en padronPendiente (no toca users)
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const root    = join(dirname(fileURLToPath(import.meta.url)), '..');
const force   = process.argv.includes('--force');
const saKey   = JSON.parse(readFileSync(join(root, 'serviceAccountKey.json'), 'utf8'));
const socios  = JSON.parse(readFileSync(join(root, 'scripts', 'padron-data.json'), 'utf8'));

initializeApp({ credential: cert(saKey) });
const db = getFirestore();

console.log(`Cargando ${socios.length} socios a padronPendiente (force=${force})...`);

let creados = 0, omitidos = 0, actualizados = 0, errores = 0;

for (const socio of socios) {
  const email = socio.email.toLowerCase().trim();
  const ref   = db.collection('padronPendiente').doc(email);

  try {
    const snap = await ref.get();

    if (snap.exists && !force) {
      omitidos++;
      continue;
    }

    const data = {
      nombre:      socio.nombre,
      rut:         socio.rut,
      email,
      celular:     socio.celular || '',
      estamento:   socio.estamento,
      calidad:     socio.calidad,
      base:        socio.base || '',
      rolAsignado: socio.rolAsignado || 'socio',
      inscritoEn:  snap.exists ? snap.data().inscritoEn : FieldValue.serverTimestamp(),
    };

    await ref.set(data, { merge: false });

    if (snap.exists) {
      actualizados++;
      console.log(`  [UPDATE] ${email}`);
    } else {
      creados++;
    }
  } catch (err) {
    errores++;
    console.error(`  [ERROR] ${email}:`, err.message);
  }
}

console.log('\nResultado:');
console.log(`  Creados:      ${creados}`);
console.log(`  Actualizados: ${actualizados}`);
console.log(`  Omitidos:     ${omitidos} (ya existen — usa --force para pisar)`);
console.log(`  Errores:      ${errores}`);
process.exit(errores > 0 ? 1 : 0);
