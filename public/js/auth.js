// Autenticación — Google Sign-In contra el padrón de Firestore.
import {
  auth, db,
  GoogleAuthProvider, OAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from './firebase.js';
import { setSentryUser, clearSentryUser } from './sentry.js';
import { dlog, dgroup, dgroupEnd } from './debug.js'; // [DEBUG]

const SUPERADMIN_DOMAIN = '@micorriza.bio';
export let currentUser     = null;
export let currentUserData = null;

function authError(code) {
  return Object.assign(new Error(code), { code });
}

// AUTO-BOOTSTRAP: una cuenta @micorriza.bio sin ficha se crea a sí misma como
// superadmin (la regla de bootstrap en firestore.rules solo permite esto sobre
// su propio uid y con email del token). Resuelve el bloqueo del primer acceso.
async function bootstrapSuperadmin(firebaseUser) {
  const esMicorriza = firebaseUser.email?.endsWith(SUPERADMIN_DOMAIN);
  dlog('auth', `¿@micorriza.bio? ${!!esMicorriza}`); // [DEBUG]
  if (!esMicorriza) return null;
  dlog('rules', 'Creando ficha superadmin (bootstrap)...'); // [DEBUG]
  const data = {
    rut:          '',
    nombre:       firebaseUser.displayName || 'Micorriza Admin',
    email:        firebaseUser.email,
    estamento:    'Administración',
    calidad:      '',
    celular:      '',
    rol:          'superadmin',
    activo:       true,
    estadoCuota:  'Al día',
    camposExtra:  {},
    onboardingOk: true,
    creadoEn:     serverTimestamp(),
    ultimoLogin:  serverTimestamp(),
  };
  try {
    await setDoc(doc(db, 'users', firebaseUser.uid), data);
    dlog('ok', 'setDoc superadmin EXITOSO'); // [DEBUG]
  } catch (err) {
    dlog('error', 'setDoc superadmin FALLÓ — RULES rechazaron', { // [DEBUG]
      code: err.code, message: err.message, email: firebaseUser.email });
    throw err;
  }
  return data;
}

// Un socio inscrito por el directorio existe primero en padronPendiente/{email}.
// Al primer login con Google se "reclama" la ficha: se copia a users/{uid}
// (las Security Rules solo lo permiten si el email coincide con el del token).
async function reclamarFichaPendiente(firebaseUser) {
  const email = (firebaseUser.email || '').toLowerCase();
  if (!email) return null;
  dlog('auth', `Buscando padronPendiente/${email}`); // [DEBUG]
  const pendRef = doc(db, 'padronPendiente', email);
  let pendSnap;
  try {
    pendSnap = await getDoc(pendRef);
    dlog('info', `Pendiente existe: ${pendSnap.exists()}`); // [DEBUG]
  } catch (err) {
    dlog('error', 'getDoc padronPendiente falló', { code: err.code, message: err.message }); // [DEBUG]
    throw err;
  }
  if (!pendSnap.exists()) return null;

  // El superadmin puede pre-asignar el rol (y cargo) en la pre-inscripción:
  // la persona entra directo a su perfil correspondiente en el primer login.
  const pendData = pendSnap.data();
  const rolAsignado = pendData.rolAsignado === 'directorio' ? 'directorio' : 'socio';
  dlog('rules', `Reclamando ficha (rol pre-asignado: ${rolAsignado})...`); // [DEBUG]
  const data = {
    ...pendData,
    email,
    rol: rolAsignado,
    activo: true,
    onboardingOk: false,
    ultimoLogin: serverTimestamp(),
  };
  delete data.rolAsignado;
  try {
    await setDoc(doc(db, 'users', firebaseUser.uid), data);
    dlog('ok', 'Reclamo exitoso'); // [DEBUG]
  } catch (err) {
    dlog('error', 'Reclamo falló — RULES rechazaron', { code: err.code, message: err.message }); // [DEBUG]
    throw err;
  }
  try { await deleteDoc(pendRef); } catch (e) { console.warn('No se pudo limpiar la ficha pendiente:', e.code); }
  return data;
}

// Inicia el flujo de login: redirige la página completa a Google.
// No resuelve con el usuario — al volver del redirect, procesarRedirectLogin()
// captura el resultado. (signInWithPopup quedaba bloqueado por COOP.)
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  dlog('auth', 'Redirigiendo a Google...'); // [DEBUG]
  await signInWithRedirect(auth, provider);
}

// Login con Microsoft (@hotmail, @live, @outlook) — mismo flujo de redirect.
// tenant 'consumers' habilita las cuentas personales Microsoft.
export async function loginWithMicrosoft() {
  const provider = new OAuthProvider('microsoft.com');
  provider.setCustomParameters({
    prompt: 'select_account',
    tenant: 'consumers',
  });
  dlog('auth', 'Redirigiendo a Microsoft...'); // [DEBUG]
  await signInWithRedirect(auth, provider);
}

// Procesa el retorno del redirect de Google: bootstrap superadmin, reclamo de
// padronPendiente y validaciones de ficha. Devuelve { firebaseUser, userData }
// si hubo login por redirect, o null si la página no viene de uno.
export async function procesarRedirectLogin() {
  dgroup('procesarRedirectLogin'); // [DEBUG]
  let result;
  try {
    result = await getRedirectResult(auth);
  } catch (err) {
    dlog('error', `getRedirectResult falló: ${err.code}`, err.message); // [DEBUG]
    dgroupEnd();
    // Mismo email registrado con otro proveedor (Google vs Microsoft)
    if (err.code === 'auth/account-exists-with-different-credential') {
      throw authError('EMAIL_YA_EXISTE');
    }
    throw err;
  }

  if (!result) {
    dlog('info', 'Sin redirect pendiente'); // [DEBUG]
    dgroupEnd();
    return null;
  }

  const firebaseUser = result.user;
  dlog('ok', 'Redirect OK', { uid: firebaseUser.uid, email: firebaseUser.email }); // [DEBUG]
  let data;
  try {
    dlog('auth', `Leyendo users/${firebaseUser.uid}`); // [DEBUG]
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    data = userDoc.exists() ? userDoc.data() : null;
    dlog('info', `Ficha existe: ${userDoc.exists()}`, data); // [DEBUG]
  } catch (err) {
    dlog('error', 'getDoc users/{uid} falló — posible bloqueo de RULES', { // [DEBUG]
      code: err.code, message: err.message });
    dgroupEnd();
    throw err;
  }

  try {
    if (!data) {
      data = await bootstrapSuperadmin(firebaseUser);
    }
    if (!data) {
      data = await reclamarFichaPendiente(firebaseUser);
    }
  } catch (err) {
    dgroupEnd(); // [DEBUG] el detalle ya quedó logueado dentro del helper
    throw err;
  }

  if (!data) {
    dlog('error', 'DECISIÓN: signOut — sin ficha tras todos los intentos'); // [DEBUG]
    await signOut(auth);
    dgroupEnd();
    throw authError('NO_REGISTRADO');
  }
  dlog('info', `Estado: activo=${data.activo}, rol=${data.rol}`); // [DEBUG]

  if (!data.activo) {
    dlog('error', 'DECISIÓN: signOut — inactivo'); // [DEBUG]
    await signOut(auth);
    dgroupEnd();
    throw authError('INACTIVO');
  }

  // Superadmin solo puede ser @micorriza.bio
  if (data.rol === 'superadmin' && !firebaseUser.email?.endsWith(SUPERADMIN_DOMAIN)) {
    dlog('error', 'DECISIÓN: signOut — superadmin dominio inválido'); // [DEBUG]
    await signOut(auth);
    dgroupEnd();
    throw authError('DOMINIO_INVALIDO');
  }

  dlog('ok', 'LOGIN EXITOSO'); // [DEBUG]
  dgroupEnd();
  return { firebaseUser, userData: data };
}

export async function logout() {
  clearSentryUser();
  await signOut(auth);
  window.location.href = '/login.html';
}

export function watchAuth(onLogin, onLogout) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      dgroup('watchAuth'); // [DEBUG]
      dlog('auth', `Sesión detectada: ${firebaseUser.email} (${firebaseUser.uid})`); // [DEBUG]
      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);
        let data = snap.exists() ? snap.data() : null;
        dlog('info', `Ficha existe: ${snap.exists()}`, data); // [DEBUG]
        // Mismo auto-bootstrap/reclamo que en loginWithGoogle: cubre el caso en
        // que la sesión se restaura (o el login redirige) antes de crear la ficha
        if (!data) {
          data = await bootstrapSuperadmin(firebaseUser);
        }
        if (!data) {
          data = await reclamarFichaPendiente(firebaseUser);
        }
        const valido = data
          && data.activo
          && !(data.rol === 'superadmin' && !firebaseUser.email?.endsWith(SUPERADMIN_DOMAIN));
        dlog('info', `Validación final: ${valido ? 'OK' : 'RECHAZADO'} (activo=${data?.activo}, rol=${data?.rol})`); // [DEBUG]
        if (valido) {
          currentUser     = firebaseUser;
          currentUserData = { uid: firebaseUser.uid, ...data };
          setSentryUser({ uid: firebaseUser.uid, rol: currentUserData.rol });
          // Actualizar último login (no bloquea la sesión si falla)
          try { await updateDoc(userRef, { ultimoLogin: serverTimestamp() }); }
          catch (e) { console.warn('ultimoLogin:', e.code); }
          dlog('ok', 'DECISIÓN: onLogin'); // [DEBUG]
          dgroupEnd();
          onLogin(currentUser, currentUserData);
        } else {
          dlog('error', 'DECISIÓN: signOut — ficha inexistente, inactiva o rol inválido'); // [DEBUG]
          dgroupEnd();
          await signOut(auth);
          onLogout();
        }
      } catch (e) {
        dlog('error', `watchAuth excepción: ${e.code || ''}`, e.message); // [DEBUG]
        dgroupEnd();
        console.error('watchAuth:', e);
        await signOut(auth);
        onLogout();
      }
    } else {
      dlog('auth', 'watchAuth: sin sesión → onLogout'); // [DEBUG]
      currentUser = currentUserData = null;
      clearSentryUser();
      onLogout();
    }
  });
}

export function refreshUserData(data) {
  currentUserData = { ...currentUserData, ...data };
}
