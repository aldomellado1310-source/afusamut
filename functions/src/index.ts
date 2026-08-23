import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

initializeApp();

// Códigos cortos de los permisos que consume storage.rules. Deben coincidir
// con el campo `codigo` de public/js/permisos.js: los ids completos no caben
// en un custom claim (el tope de Firebase Auth es 1000 bytes).
const CODIGO_PERMISO: Record<string, string> = {
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

type Claims = { rol?: string; perm?: string[] | null };

// Devuelve los códigos de permiso del cargo, o null si el control por cargo
// está apagado (o nunca se configuró). null significa "sin restricción": es lo
// que hace que storage.rules conserve el comportamiento histórico.
async function codigosDelCargo(cargoKey: string | undefined): Promise<string[] | null> {
  const cfg = await getFirestore().doc('config/permisos').get();
  const data = cfg.exists ? cfg.data() : null;
  if (!data || data.activo !== true) return null;
  const matriz = (data.matriz || {}) as Record<string, string[]>;
  const ids = matriz[cargoKey || 'sin-cargo'] || [];
  return ids.map((id) => CODIGO_PERMISO[id]).filter(Boolean) as string[];
}

function mismosClaims(a: Claims | undefined, b: Claims): boolean {
  if (!a) return false;
  if (a.rol !== b.rol) return false;
  const pa = a.perm ?? null;
  const pb = b.perm ?? null;
  if (pa === null || pb === null) return pa === pb;
  return pa.length === pb.length && pa.every((v, i) => v === pb[i]);
}

async function sincronizarUsuario(uid: string, rol: string, cargoKey?: string) {
  const auth = getAuth();
  const user = await auth.getUser(uid).catch(() => null);
  if (!user) return;

  // El superadmin no necesita lista: storage.rules lo deja pasar por el rol.
  const perm = rol === 'superadmin' ? null : await codigosDelCargo(cargoKey);
  const nuevos: Claims = { rol, perm };
  if (mismosClaims(user.customClaims as Claims | undefined, nuevos)) return;
  await auth.setCustomUserClaims(uid, nuevos);
}

// Mantiene los custom claims `rol` y `perm` del token de Auth sincronizados
// con users/{uid}, para que storage.rules los lea sin llamadas cruzadas a
// Firestore. Reemplaza al script manual scripts/sync-role-claims.mjs una vez
// desplegada (requiere plan Blaze).
export const syncRoleClaim = onDocumentWritten('users/{uid}', async (event) => {
  const uid = event.params.uid;
  const after = event.data?.after?.data();

  // Documento borrado: no hay rol que sincronizar.
  if (!after) return;

  const rol = after.rol as string | undefined;
  if (!rol) return;

  await sincronizarUsuario(uid, rol, after.cargoKey as string | undefined);
});

// Cambiar la matriz de permisos cambia lo que puede hacer TODO el Directorio,
// así que hay que reemitir los claims de todos sus miembros.
export const syncPermisosClaims = onDocumentWritten('config/permisos', async () => {
  const db = getFirestore();
  const snap = await db.collection('users')
    .where('rol', 'in', ['directorio', 'superadmin'])
    .get();

  for (const d of snap.docs) {
    const u = d.data();
    await sincronizarUsuario(d.id, u.rol as string, u.cargoKey as string | undefined);
  }
});
