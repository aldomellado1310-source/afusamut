/**
 * Sincroniza el campo `rol` de cada users/{uid} como custom claim en Firebase
 * Auth, para que storage.rules pueda leerlo desde request.auth.token.rol sin
 * llamadas cruzadas a Firestore. Uso manual mientras no exista la Cloud
 * Function equivalente (requiere plan Blaze) — re-ejecutar cada vez que
 * cambie el rol de un socio.
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

const usersSnap = await db.collection('users').get();
let actualizados = 0;
let sinCambio = 0;

for (const d of usersSnap.docs) {
  const rol = d.data().rol;
  if (!rol) continue;
  const authUser = await auth.getUser(d.id).catch(() => null);
  if (!authUser) continue;
  if (authUser.customClaims?.rol === rol) { sinCambio++; continue; }
  await auth.setCustomUserClaims(d.id, { rol });
  actualizados++;
}

console.log(`Claims actualizados: ${actualizados}. Ya estaban al día: ${sinCambio}.`);
console.log('Nota: cada usuario afectado necesita cerrar sesión y volver a entrar (o esperar el refresh automático del ID token) para que el nuevo claim tenga efecto.');
