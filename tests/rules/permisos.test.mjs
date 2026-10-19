/**
 * Prueba de las Security Rules del control de permisos por cargo.
 *
 * Levanta usuarios reales en el emulador de Auth, siembra el padrón con el
 * Admin SDK (que se salta las reglas) y luego intenta cada operación con la
 * sesión de cada cargo, comprobando que el servidor permite o niega lo que
 * corresponde. Es la única forma de verificar que el control no es cosmético.
 *
 * Uso: npm run test:rules
 *  (equivale a: firebase emulators:exec --only auth,firestore
 *               "node tests/rules/permisos.test.mjs")
 */
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const PROJECT = 'afusamuth';

import { initializeApp as adminInit } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator,
  doc, setDoc, getDoc, getDocs, addDoc, updateDoc, collection,
} from 'firebase/firestore';

/* ─────────────── Reparto por defecto (espejo de permisos.js) ─────────────── */
const MATRIZ = {
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

/* ─────────────── Utilidades de aserción ─────────────── */
let ok = 0;
const fallos = [];
function anotar(bien, desc, extra) {
  if (bien) { ok++; console.log('  ✔ ' + desc); }
  else { fallos.push(desc + (extra ? ' → ' + extra : '')); console.log('  ✘ ' + desc + (extra ? ' → ' + extra : '')); }
}
async function permite(desc, fn) {
  try { await fn(); anotar(true, desc); }
  catch (e) { anotar(false, desc, 'denegado (' + (e.code || e.message) + ')'); }
}
async function deniega(desc, fn) {
  try { await fn(); anotar(false, desc, 'la operación fue PERMITIDA'); }
  catch (e) {
    anotar(e.code === 'permission-denied', desc,
      e.code === 'permission-denied' ? '' : 'error inesperado: ' + (e.code || e.message));
  }
}

/* ─────────────── Siembra con el Admin SDK ─────────────── */
adminInit({ projectId: PROJECT });
const admin = adminFirestore();

const ACTORES = {
  presidente:  { email: 'pres@afusamut.cl',      rol: 'directorio', cargoKey: 'presidente',  cargo: 'Presidente' },
  tesorero:    { email: 'teso@afusamut.cl',      rol: 'directorio', cargoKey: 'tesorero',    cargo: 'Tesorero/a' },
  secretario:  { email: 'secre@afusamut.cl',     rol: 'directorio', cargoKey: 'secretario',  cargo: 'Secretario/a' },
  director:    { email: 'dire@afusamut.cl',      rol: 'directorio', cargoKey: 'director',    cargo: 'Director/a' },
  socia:       { email: 'socia@afusamut.cl',     rol: 'socio' },
  superadmin:  { email: 'admin@micorriza.bio',   rol: 'superadmin' },
};

async function conectar(nombre, actor) {
  const app  = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT }, nombre);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://' + AUTH_HOST, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, ...String(process.env.FIRESTORE_EMULATOR_HOST).split(':'));
  const cred = await createUserWithEmailAndPassword(auth, actor.email, 'clave-de-prueba-123');
  return { app, db, uid: cred.user.uid };
}

console.log('Creando sesiones en el emulador de Auth…');
const ctx = {};
for (const [nombre, actor] of Object.entries(ACTORES)) {
  ctx[nombre] = await conectar(nombre, actor);
  await admin.doc('users/' + ctx[nombre].uid).set({
    nombre:    nombre,
    email:     actor.email,
    rol:       actor.rol,
    activo:    true,
    estamento: 'Prueba',
    ...(actor.cargo ? { cargo: actor.cargo, cargoKey: actor.cargoKey } : {}),
  });
}

async function fijarControl(activo) {
  await admin.doc('config/permisos').set({ matriz: MATRIZ, activo, version: 2 });
}

const movimiento = () => ({
  fecha: '2026-08-23', tipo: 'egreso', categoria: 'Otros',
  descripcion: 'prueba', monto: 1000, boletaUrl: null,
});
const socioNuevo = (n) => ({
  nombre: n, email: n + '@afusamut.cl', rol: 'socio', activo: true, estamento: 'Prueba',
});

/* ═══════════════ CONTROL ACTIVO ═══════════════ */
console.log('\n── Control por cargo ACTIVO ──');
await fijarControl(true);

console.log('\nFinanzas — solo Tesorería');
await permite('tesorero registra un movimiento',
  () => addDoc(collection(ctx.tesorero.db, 'movimientos'), movimiento()));
await deniega('presidente NO registra movimientos',
  () => addDoc(collection(ctx.presidente.db, 'movimientos'), movimiento()));
await deniega('secretario NO registra movimientos',
  () => addDoc(collection(ctx.secretario.db, 'movimientos'), movimiento()));
await permite('presidente SÍ lee el libro de caja (transparencia)',
  () => getDocs(collection(ctx.presidente.db, 'movimientos')));

console.log('\nPadrón — solo Tesorería administra, todo el Directorio consulta');
await permite('tesorero inscribe un socio',
  () => setDoc(doc(ctx.tesorero.db, 'users', 'socio-alta-1'), socioNuevo('alta1')));
await deniega('secretario NO inscribe socios',
  () => setDoc(doc(ctx.secretario.db, 'users', 'socio-alta-2'), socioNuevo('alta2')));
await deniega('presidente NO inscribe socios',
  () => setDoc(doc(ctx.presidente.db, 'users', 'socio-alta-3'), socioNuevo('alta3')));
await permite('presidente lista el padrón completo',
  () => getDocs(collection(ctx.presidente.db, 'users')));
await deniega('la socia NO lista el padrón completo',
  () => getDocs(collection(ctx.socia.db, 'users')));

console.log('\nPadrón — caminos legítimos de edición (no deben romperse)');
await permite('tesorero edita los datos básicos de un socio',
  () => updateDoc(doc(ctx.tesorero.db, 'users', 'socio-alta-1'), { celular: '+56900000000' }));
await permite('tesorero registra la renuncia de un socio',
  () => updateDoc(doc(ctx.tesorero.db, 'users', 'socio-alta-1'), {
    estadoSocio: 'renunciado', fechaRenuncia: '2026-08-23', motivoRenuncia: 'traslado', activo: false,
  }));
await permite('tesorero reincorpora al socio',
  () => updateDoc(doc(ctx.tesorero.db, 'users', 'socio-alta-1'), {
    estadoSocio: 'activo', fechaReincorporacion: '2026-08-24', activo: true,
  }));
await permite('la socia actualiza sus propios flags de sesión',
  () => updateDoc(doc(ctx.socia.db, 'users', ctx.socia.uid), { onboardingOk: true, loginCount: 1 }));
await deniega('la socia NO puede inflar su contador de ingresos',
  () => updateDoc(doc(ctx.socia.db, 'users', ctx.socia.uid), { loginCount: 99 }));

console.log('\nDiario Mural — presidencia, tesorería y secretaría publican');
const aviso = { titulo: 'Aviso', cuerpo: 'Cuerpo del aviso', creadoEn: new Date() };
await permite('presidente publica en el mural',
  () => addDoc(collection(ctx.presidente.db, 'notificaciones'), aviso));
await permite('tesorero publica en el mural',
  () => addDoc(collection(ctx.tesorero.db, 'notificaciones'), aviso));
await permite('secretario publica en el mural',
  () => addDoc(collection(ctx.secretario.db, 'notificaciones'), aviso));
await deniega('director NO publica en el mural',
  () => addDoc(collection(ctx.director.db, 'notificaciones'), aviso));

console.log('\nActas — secretaría');
const acta = { fecha: '2026-08-23', tipo: 'Asamblea', titulo: 'Acta', publicada: true, texto: 'x' };
await permite('secretario registra un acta',
  () => setDoc(doc(ctx.secretario.db, 'actas', 'acta-1'), acta));
await deniega('tesorero NO registra actas',
  () => setDoc(doc(ctx.tesorero.db, 'actas', 'acta-2'), acta));

console.log('\nAuditoría — la presidencia visualiza todo');
await permite('presidente lee el registro de auditoría',
  () => getDocs(collection(ctx.presidente.db, 'auditLog')));
await deniega('tesorero NO lee el registro de auditoría',
  () => getDocs(collection(ctx.tesorero.db, 'auditLog')));

console.log('\nConfiguración — la matriz es solo del superadmin');
await deniega('tesorero NO edita la matriz de permisos',
  () => setDoc(doc(ctx.tesorero.db, 'config', 'permisos'), { matriz: MATRIZ, activo: false }));
await deniega('presidente NO edita la matriz de permisos',
  () => setDoc(doc(ctx.presidente.db, 'config', 'permisos'), { matriz: MATRIZ, activo: false }));
await permite('superadmin edita la matriz de permisos',
  () => setDoc(doc(ctx.superadmin.db, 'config', 'permisos'), { matriz: MATRIZ, activo: true, version: 2 }));
await permite('tesorero configura el valor de las cuotas',
  () => setDoc(doc(ctx.tesorero.db, 'config', 'cuotas'), { categorias: [] }));
await deniega('secretario NO configura las cuotas',
  () => setDoc(doc(ctx.secretario.db, 'config', 'cuotas'), { categorias: [] }));

console.log('\nEscalada de privilegios — nadie se auto-asciende');
await deniega('tesorero NO cambia el cargo de otro directivo',
  () => updateDoc(doc(ctx.tesorero.db, 'users', ctx.director.uid), { cargoKey: 'tesorero' }));
await deniega('tesorero NO cambia su propio cargo',
  () => updateDoc(doc(ctx.tesorero.db, 'users', ctx.tesorero.uid), { cargoKey: 'presidente', cargo: 'Presidente' }));
await deniega('director NO se asciende a directorio… ni cambia roles',
  () => updateDoc(doc(ctx.director.db, 'users', ctx.socia.uid), { rol: 'directorio' }));

/* ═══════════════ CONTROL INACTIVO (compatibilidad) ═══════════════ */
console.log('\n── Control por cargo INACTIVO (comportamiento histórico) ──');
await fijarControl(false);
await permite('presidente vuelve a registrar movimientos',
  () => addDoc(collection(ctx.presidente.db, 'movimientos'), movimiento()));
await permite('director vuelve a publicar en el mural',
  () => addDoc(collection(ctx.director.db, 'notificaciones'), aviso));
await permite('secretario vuelve a inscribir socios',
  () => setDoc(doc(ctx.secretario.db, 'users', 'socio-alta-9'), socioNuevo('alta9')));
await deniega('pero el cargo sigue siendo intocable para el Directorio',
  () => updateDoc(doc(ctx.secretario.db, 'users', ctx.director.uid), { cargo: 'Tesorero/a' }));
await deniega('y la socia sigue sin poder registrar movimientos',
  () => addDoc(collection(ctx.socia.db, 'movimientos'), movimiento()));

/* ═══════════════ SIN DOCUMENTO DE CONFIGURACIÓN ═══════════════ */
console.log('\n── Sin config/permisos (instalación que aún no migró) ──');
await admin.doc('config/permisos').delete();
await permite('todo el Directorio conserva sus permisos de siempre',
  () => addDoc(collection(ctx.director.db, 'movimientos'), movimiento()));
await permite('y el superadmin sigue leyendo la auditoría',
  () => getDocs(collection(ctx.superadmin.db, 'auditLog')));
await deniega('los socios siguen fuera',
  () => getDoc(doc(ctx.socia.db, 'users', ctx.presidente.uid)));

/* ─────────────── Resultado ─────────────── */
console.log('\n════════════════════════════════════════');
console.log(`Comprobaciones superadas: ${ok} · fallidas: ${fallos.length}`);
if (fallos.length) {
  console.log('\nFALLOS:');
  fallos.forEach(f => console.log('  · ' + f));
  process.exit(1);
}
console.log('Todas las reglas de permisos por cargo se comportan como corresponde.');
process.exit(0);
