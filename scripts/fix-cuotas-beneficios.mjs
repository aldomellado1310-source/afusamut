/**
 * Migración:
 *  1. Renombra categorías de cuotas y elimina estamentos que no existen en el SAMU
 *  2. Desactiva todos los beneficios que no sean OPTIMED
 *
 * Uso: node scripts/fix-cuotas-beneficios.mjs
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'),
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── 1. Actualizar categorías de cuotas ────────────────────────────────────
const CATEGORIAS_NUEVAS = [
  {
    nombre: 'Profesionales Clínicos',
    montoCLP: 10000,
    estamentos: ['Reanimador/a', 'Enfermero/a'],
  },
  {
    nombre: 'Técnicos y Administrativos',
    montoCLP: 5000,
    estamentos: ['TENS', 'Conductor/a', 'Técnico/a', 'Administrativo/a', 'Regulación'],
  },
];

async function actualizarCuotas() {
  const ref = db.collection('config').doc('cuotas');
  const snap = await ref.get();
  if (!snap.exists) { console.log('⚠️  No existe config/cuotas — ejecuta seed-cuotas.mjs primero.'); return; }
  await ref.update({ categorias: CATEGORIAS_NUEVAS, actualizadoEn: FieldValue.serverTimestamp() });
  console.log('✓ config/cuotas actualizado:');
  CATEGORIAS_NUEVAS.forEach(c => console.log(`   ${c.nombre}: $${c.montoCLP} — ${c.estamentos.join(', ')}`));
}

// ─── 2. Desactivar beneficios que no sean OPTIMED ──────────────────────────
async function desactivarBeneficiosAntiguos() {
  const snap = await db.collection('beneficios').get();
  const batch = db.batch();
  let desactivados = 0;

  snap.forEach(doc => {
    const data = doc.data();
    // Conservar OPTIMED (detectar por código o título)
    const esOptimed = (data.codigo || '').toUpperCase().includes('OPTIMED')
      || (data.titulo || '').toUpperCase().includes('OPTIMED');
    if (!esOptimed && data.activo !== false) {
      batch.update(doc.ref, { activo: false });
      console.log(`   Desactivando: ${data.titulo || doc.id}`);
      desactivados++;
    }
  });

  if (desactivados > 0) {
    await batch.commit();
    console.log(`✓ ${desactivados} beneficio(s) desactivado(s).`);
  } else {
    console.log('✓ No había beneficios activos para desactivar (excepto OPTIMED).');
  }
}

console.log('\n[1/2] Actualizando categorías de cuotas…');
await actualizarCuotas();

console.log('\n[2/2] Desactivando beneficios no vigentes…');
await desactivarBeneficiosAntiguos();

console.log('\n✓ Migración completa.');