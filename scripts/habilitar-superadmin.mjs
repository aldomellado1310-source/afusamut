// Pre-aprovisiona un superadmin con el Admin SDK (sin esperar su primer login).
// Uso: node scripts/habilitar-superadmin.mjs <email@micorriza.bio> ["Nombre Apellido"]
//
// Crea (o reutiliza) el usuario en Firebase Auth y escribe users/{uid} con rol
// superadmin. Cuando la persona entre con Google, Firebase vincula la cuenta al
// mismo uid por coincidencia de email verificado.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const SUPERADMIN_DOMAIN = '@micorriza.bio';
const email = (process.argv[2] || '').trim().toLowerCase();
const nombre = process.argv[3] || null;

if (!email.endsWith(SUPERADMIN_DOMAIN)) {
  console.error(`El rol superadmin es exclusivo de cuentas ${SUPERADMIN_DOMAIN}. Recibido: "${email}"`);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serviceAccount = JSON.parse(readFileSync(join(root, 'serviceAccountKey.json'), 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
let user;
try {
  user = await auth.getUserByEmail(email);
  console.log(`Usuario Auth existente: ${user.uid}`);
} catch (e) {
  if (e.code !== 'auth/user-not-found') throw e;
  user = await auth.createUser({ email, emailVerified: true, displayName: nombre || undefined });
  console.log(`Usuario Auth creado: ${user.uid}`);
}

const db = getFirestore();
const ref = db.collection('users').doc(user.uid);
const snap = await ref.get();

await ref.set({
  rut:          snap.exists ? (snap.data().rut || '') : '',
  nombre:       nombre || user.displayName || (snap.exists ? snap.data().nombre : null) || 'Micorriza Admin',
  email,
  estamento:    'Administración',
  calidad:      '',
  celular:      snap.exists ? (snap.data().celular || '') : '',
  rol:          'superadmin',
  activo:       true,
  estadoCuota:  'Al día',
  camposExtra:  snap.exists ? (snap.data().camposExtra || {}) : {},
  onboardingOk: true,
  creadoEn:     snap.exists ? snap.data().creadoEn : FieldValue.serverTimestamp(),
  ultimoLogin:  snap.exists ? (snap.data().ultimoLogin || null) : null,
}, { merge: true });

console.log(`✅ ${email} habilitado como superadmin (users/${user.uid})`);
process.exit(0);
