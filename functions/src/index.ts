import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

initializeApp();

// Mantiene el custom claim `rol` del token de Auth sincronizado con
// users/{uid}.rol, para que storage.rules pueda leerlo sin llamadas
// cruzadas a Firestore (request.auth.token.rol). Reemplaza al script
// manual scripts/sync-role-claims.mjs una vez desplegada (requiere
// plan Blaze).
export const syncRoleClaim = onDocumentWritten('users/{uid}', async (event) => {
  const uid = event.params.uid;
  const after = event.data?.after?.data();

  // Documento borrado: no hay rol que sincronizar.
  if (!after) return;

  const rol = after.rol as string | undefined;
  if (!rol) return;

  const auth = getAuth();
  const user = await auth.getUser(uid).catch(() => null);
  if (!user) return;

  if (user.customClaims?.rol === rol) return; // ya está al día
  await auth.setCustomUserClaims(uid, { rol });
});
