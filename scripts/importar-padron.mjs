// Importa los socios preinscritos desde el Excel de la base de datos AFUSAMUT
// hacia la colección padronPendiente de Firestore.
//
// Uso:  node scripts/importar-padron.mjs [ruta-al-xlsx]
//
// Si no se pasa ruta, busca BASE_DE_DATOS_SOCIOS_AFUSAMUT.xlsx en la raíz del proyecto.
// Requiere serviceAccountKey.json en la raíz del proyecto.
//
// Comportamiento:
//   - El documento ID es el email en minúsculas.
//   - Si ya existe el documento, se actualiza (merge) sin sobrescribir rolAsignado.
//   - Todos los socios se preinscriben con rolAsignado = 'socio'.
//   - Al primer login con Google/Microsoft, el socio "reclama" su ficha y se
//     crea su documento en /users con el rol preconfigurado.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

// ── Credenciales ──────────────────────────────────────────────────────────────
const keyPath = join(root, 'serviceAccountKey.json');
if (!existsSync(keyPath)) {
  console.error('❌  Falta serviceAccountKey.json en la raíz del proyecto.');
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Excel ─────────────────────────────────────────────────────────────────────
const xlsxPath = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, 'BASE_DE_DATOS_SOCIOS_AFUSAMUT.xlsx');

if (!existsSync(xlsxPath)) {
  console.error(`❌  No se encontró el archivo Excel en: ${xlsxPath}`);
  console.error('   Pasa la ruta como argumento: node scripts/importar-padron.mjs <ruta.xlsx>');
  process.exit(1);
}

const wb  = XLSX.readFile(xlsxPath);
const ws  = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

// La primera fila de datos real tiene número en la primera columna
const HEADER_KEY = Object.keys(raw[0] || {})[0]; // 'BASE DE DATOS SOCIOS...'

const socios = raw
  .filter(r => typeof r[HEADER_KEY] === 'number' && String(r['__EMPTY_2']).includes('@'))
  .map(r => ({
    nombre:       String(r['__EMPTY']).trim(),
    rut:          String(r['__EMPTY_1']).trim(),
    email:        String(r['__EMPTY_2']).trim().toLowerCase(),
    telefono:     String(r['__EMPTY_3']).trim(),
    base:         String(r['__EMPTY_4']).trim(),
    estamento:    String(r['__EMPTY_5']).trim(),
    calidad:      String(r['__EMPTY_6']).trim(),
    rolAsignado:  'socio',
  }));

if (socios.length === 0) {
  console.error('❌  No se encontraron registros válidos en el Excel.');
  process.exit(1);
}

console.log(`📋  ${socios.length} socios leídos del Excel.`);

// ── Importar en lotes de 500 (límite de Firestore batch) ─────────────────────
const col = db.collection('padronPendiente');
let escritos = 0;
let omitidos = 0;

const BATCH_SIZE = 500;
for (let i = 0; i < socios.length; i += BATCH_SIZE) {
  const lote = socios.slice(i, i + BATCH_SIZE);
  const batch = db.batch();

  for (const s of lote) {
    const ref = col.doc(s.email);
    const snap = await ref.get();

    if (snap.exists) {
      // Actualiza campos del Excel sin pisar rolAsignado si ya fue modificado
      batch.set(ref, {
        nombre:    s.nombre,
        rut:       s.rut,
        email:     s.email,
        telefono:  s.telefono,
        base:      s.base,
        estamento: s.estamento,
        calidad:   s.calidad,
        // rolAsignado: no se toca (puede haberlo cambiado un superadmin)
        actualizadoEn: FieldValue.serverTimestamp(),
      }, { merge: true });
      omitidos++;
    } else {
      batch.set(ref, {
        ...s,
        creadoEn: FieldValue.serverTimestamp(),
      });
      escritos++;
    }
  }

  await batch.commit();
}

console.log(`✅  Importación completada:`);
console.log(`   • ${escritos} socios nuevos creados en padronPendiente`);
console.log(`   • ${omitidos} socios existentes actualizados (rolAsignado no modificado)`);
console.log();
console.log('Cuando un socio inicie sesión con Google o Microsoft usando su email,');
console.log('reclamará automáticamente su ficha y quedará inscrito con rol "socio".');
process.exit(0);
