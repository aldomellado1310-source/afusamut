/**
 * Prepara el control de permisos por cargo:
 *   1. Rellena `cargoKey` en cada users/{uid} del Directorio a partir de su
 *      `cargo` (es el campo que leen firestore.rules).
 *   2. Escribe config/permisos con el reparto estatutario por defecto.
 *
 * Por seguridad queda DESACTIVADO (activo:false): el Directorio conserva sus
 * permisos de siempre hasta que alguien lo active, desde el panel 🔐 Permisos
 * del portal o con la bandera --activar.
 *
 * Uso: node scripts/seed-permisos.mjs [--activar] [--forzar]
 *   --activar  deja el control rigiendo de inmediato
 *   --forzar   sobrescribe una matriz ya existente (por defecto no la toca)
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const activar = process.argv.includes('--activar');
const forzar  = process.argv.includes('--forzar');

// Debe coincidir con MATRIZ_DEFAULT de public/js/permisos.js
const MATRIZ_DEFAULT = {
  presidente: [
    'padron.ver', 'respaldos.ver', 'poderes.ver', 'buzon.ver', 'auditoria.ver',
    'mural.publicar', 'mensajeria.enviar',
    'votaciones.gestionar', 'calendario.gestionar', 'beneficios.gestionar',
  ],
  tesorero: [
    'padron.ver', 'padron.gestionar',
    'finanzas.gestionar', 'cuotas.configurar', 'respaldos.ver', 'respaldos.subir',
    'poderes.ver', 'poderes.gestionar',
    'mural.publicar',
  ],
  secretario: [
    'padron.ver', 'respaldos.ver', 'buzon.ver',
    'mural.publicar', 'mensajeria.enviar',
    'actas.gestionar', 'votaciones.gestionar', 'calendario.gestionar',
  ],
  vicepresidente: ['padron.ver', 'respaldos.ver', 'buzon.ver', 'calendario.gestionar'],
  director: ['padron.ver', 'respaldos.ver'],
  'sin-cargo': ['padron.ver'],
};

// Misma normalización que slugCargo() en public/js/permisos.js
function slugCargo(cargo) {
  if (!cargo) return 'sin-cargo';
  return String(cargo)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\/(as?|os?)\b/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-cargo';
}

/* ── 1. Backfill de cargoKey ── */
const usersSnap = await db.collection('users')
  .where('rol', 'in', ['directorio', 'superadmin']).get();

let normalizados = 0;
const cargosVistos = new Set();
for (const d of usersSnap.docs) {
  const u = d.data();
  const key = slugCargo(u.cargo);
  if (u.rol === 'directorio') cargosVistos.add(key);
  if (u.cargoKey === key) continue;
  await d.ref.update({ cargoKey: key });
  normalizados++;
  console.log(`  · ${u.nombre || d.id}: cargo "${u.cargo || '—'}" → cargoKey "${key}"`);
}
console.log(`cargoKey normalizados: ${normalizados} de ${usersSnap.size} directivos.`);

/* ── 2. Matriz de permisos ── */
const ref = db.doc('config/permisos');
const actual = await ref.get();
if (actual.exists && !forzar) {
  console.log('config/permisos ya existe: no se toca (usa --forzar para sobrescribir).');
  console.log(`Estado actual: control ${actual.data().activo ? 'ACTIVO' : 'inactivo'}.`);
} else {
  const matriz = { ...MATRIZ_DEFAULT };
  // Cargos personalizados presentes en el padrón (p.ej. "Delegado de Bienestar")
  for (const key of cargosVistos) {
    if (!(key in matriz)) {
      matriz[key] = ['padron.ver'];
      console.log(`  · cargo personalizado detectado: "${key}" (parte solo con padron.ver)`);
    }
  }
  await ref.set({
    matriz,
    activo: activar,
    version: 2,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: 'seed-permisos.mjs',
  });
  console.log(`config/permisos escrito con ${Object.keys(matriz).length} cargos. Control ${activar ? 'ACTIVO' : 'inactivo'}.`);
}

console.log('\nSiguiente paso: node scripts/sync-role-claims.mjs (propaga los permisos a Storage).');
