/**
 * Sincroniza los custom claims de Firebase Auth con el padrón:
 *   · `rol`  ← users/{uid}.rol
 *   · `perm` ← códigos de los permisos del cargo (config/permisos)
 *
 * storage.rules los lee desde request.auth.token sin llamadas cruzadas a
 * Firestore. Uso manual mientras no esté desplegada la Cloud Function
 * equivalente (functions/, requiere plan Blaze) — re-ejecutar cada vez que
 * cambie un rol, un cargo o la matriz de permisos.
 *
 * Uso: node scripts/sync-role-claims.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
initializeApp({ credential: cert(sa) });

const db = getFirestore();
const auth = getAuth();

// Debe coincidir con el campo `codigo` de public/js/permisos.js
const CODIGO_PERMISO = {
  'padron.ver': 'pv',
  'padron.gestionar': 'pg',
  'finanzas.gestionar': 'fg',
  'cuotas.configurar': 'cc',
  'respaldos.ver': 'rv',
  'respaldos.subir': 'rs',
  'mural.publicar': 'mp',
  'mensajeria.enviar': 'me',
  'buzon.ver': 'bv',
  'actas.gestionar': 'ag',
  'votaciones.gestionar': 'vg',
  'poderes.ver': 'qv',
  'poderes.gestionar': 'qg',
  'calendario.gestionar': 'kg',
  'beneficios.gestionar': 'bg',
  'auditoria.ver': 'av',
};

const cfgSnap = await db.doc('config/permisos').get();
const cfg = cfgSnap.exists ? cfgSnap.data() : null;
const controlActivo = !!(cfg && cfg.activo === true);
const matriz = (cfg && cfg.matriz) || {};

// null = sin restricción (el control por cargo está apagado)
function codigosDelCargo(cargoKey) {
  if (!controlActivo) return null;
  const ids = matriz[cargoKey || 'sin-cargo'] || [];
  return ids.map((id) => CODIGO_PERMISO[id]).filter(Boolean);
}

function iguales(actuales, nuevos) {
  if (!actuales) return false;
  if (actuales.rol !== nuevos.rol) return false;
  const a = actuales.perm ?? null;
  const b = nuevos.perm ?? null;
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const usersSnap = await db.collection('users').get();
let actualizados = 0;
let sinCambio = 0;

const ROLES_VALIDOS = ['socio', 'directorio', 'superadmin'];
const DOMINIO_SUPERADMIN = '@micorriza.bio';
let retirados = 0;

for (const d of usersSnap.docs) {
  const { rol, cargoKey, activo } = d.data();
  const authUser = await auth.getUser(d.id).catch(() => null);
  if (!authUser) continue;
  const previos = authUser.customClaims;

  // Bajas, roles desconocidos y superadmin fuera del dominio de administración
  // NO llevan claims: se retiran y se invalida la sesión (igual que la Cloud
  // Function syncRoleClaim).
  const emitible = !!rol && activo === true && ROLES_VALIDOS.includes(rol)
    && (rol !== 'superadmin' || (authUser.email || '').toLowerCase().endsWith(DOMINIO_SUPERADMIN));
  if (!emitible) {
    if (previos && (previos.rol !== undefined || previos.perm !== undefined)) {
      await auth.setCustomUserClaims(d.id, null);
      await auth.revokeRefreshTokens(d.id).catch(() => {});
      retirados++;
    } else { sinCambio++; }
    continue;
  }

  const perm = rol === 'superadmin' ? null
    : rol === 'directorio' ? codigosDelCargo(cargoKey)
    : null;
  const nuevos = { rol, perm };

  if (iguales(previos, nuevos)) { sinCambio++; continue; }
  await auth.setCustomUserClaims(d.id, nuevos);
  actualizados++;
}

console.log(`Control por cargo: ${controlActivo ? 'ACTIVO' : 'inactivo'}.`);
console.log(`Claims actualizados: ${actualizados}. Retirados (bajas/rol inválido): ${retirados}. Ya estaban al día: ${sinCambio}.`);
console.log('Nota: cada usuario afectado necesita cerrar sesión y volver a entrar (o esperar el refresh automático del ID token) para que el nuevo claim tenga efecto.');
