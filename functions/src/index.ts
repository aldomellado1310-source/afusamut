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

// Solo estos roles se convierten en claim; cualquier otro valor se ignora.
const ROLES_VALIDOS = ['socio', 'directorio', 'superadmin'];
const DOMINIO_SUPERADMIN = '@micorriza.bio';

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

type Resultado = { previos: Claims | undefined; nuevos: Claims | null };

// Deja los custom claims del usuario como corresponde a su ficha:
//  · ficha activa y con rol válido → { rol, perm }
//  · baja (activo !== true), rol desconocido o superadmin fuera del dominio de
//    administración → se RETIRAN los claims. Sin esto, quien renuncia o es
//    desactivado conservaría su acceso a Storage al volver a iniciar sesión.
async function sincronizarUsuario(
  uid: string, rol: string, cargoKey: string | undefined, activo: boolean,
): Promise<Resultado | null> {
  const auth = getAuth();
  const user = await auth.getUser(uid).catch(() => null);
  if (!user) return null;
  const previos = user.customClaims as Claims | undefined;

  // Defensa en profundidad (las reglas ya lo exigen): el claim superadmin solo
  // se emite a cuentas del dominio de administración.
  const emitible = activo
    && ROLES_VALIDOS.includes(rol)
    && (rol !== 'superadmin' || !!user.email?.toLowerCase().endsWith(DOMINIO_SUPERADMIN));

  if (!emitible) {
    if (previos && (previos.rol !== undefined || previos.perm !== undefined)) {
      await auth.setCustomUserClaims(uid, null);
    }
    return { previos, nuevos: null };
  }

  // El superadmin no necesita lista: storage.rules lo deja pasar por el rol.
  const perm = rol === 'superadmin' ? null : await codigosDelCargo(cargoKey);
  const nuevos: Claims = { rol, perm };
  if (!mismosClaims(previos, nuevos)) await auth.setCustomUserClaims(uid, nuevos);
  return { previos, nuevos };
}

// ¿El cambio le quita al usuario algo que tenía? (para revocar su sesión)
function reduceAcceso(r: Resultado | null): boolean {
  if (!r || !r.previos || r.previos.rol === undefined) return false;
  if (!r.nuevos) return true;
  if (r.previos.rol !== r.nuevos.rol) return true;
  const antes = r.previos.perm ?? null;
  const ahora = r.nuevos.perm ?? null;
  if (antes === null) return ahora !== null;
  if (ahora === null) return false;
  return antes.some((c) => !ahora.includes(c));
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
  const antes = event.data?.before?.data();
  const activo = after.activo === true;

  const res = rol
    ? await sincronizarUsuario(uid, rol, after.cargoKey as string | undefined, activo)
    : await sincronizarUsuario(uid, '', undefined, false);

  // Se invalida la sesión (el ID token vive hasta 1 hora) cuando el usuario
  // pierde acceso: baja, cambio de rol o de cargo. No se revoca en el primer
  // alta ni cuando solo gana permisos, para no expulsar a quien recién entra.
  const bajaOCambio = !!antes && (
    (antes.activo !== false && after.activo === false)
    || antes.rol !== after.rol
    || (antes.cargoKey ?? null) !== (after.cargoKey ?? null)
  );
  if ((bajaOCambio && reduceAcceso(res)) || (antes?.activo !== false && after.activo === false)) {
    await getAuth().revokeRefreshTokens(uid).catch(() => undefined);
  }
});

// Cambiar la matriz de permisos cambia lo que puede hacer TODO el Directorio,
// así que hay que reemitir los claims de todos sus miembros.
export const syncPermisosClaims = onDocumentWritten('config/permisos', async () => {
  const db = getFirestore();
  const snap = await db.collection('users')
    .where('rol', 'in', ['directorio', 'superadmin'])
    .get();

  // Un fallo con un usuario no debe dejar sin sincronizar al resto.
  for (const d of snap.docs) {
    const u = d.data();
    try {
      const res = await sincronizarUsuario(
        d.id, u.rol as string, u.cargoKey as string | undefined, u.activo === true,
      );
      // Si la nueva matriz le quita permisos, su sesión actual no debe conservarlos
      if (reduceAcceso(res)) await getAuth().revokeRefreshTokens(d.id).catch(() => undefined);
    } catch (err) {
      console.error('syncPermisosClaims: falló', d.id, err);
    }
  }
});
