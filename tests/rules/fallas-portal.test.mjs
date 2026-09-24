/**
 * Regresión de las fallas de permisos detectadas en la auditoría del portal
 * (septiembre 2026). Cada bloque reproduce la operación EXACTA que hace el
 * portal y comprueba que el servidor responde como corresponde.
 *
 *  1. Inicio del Directorio: el Tesorero no lee el buzón (la UI ya no lo pide)
 *  2. Padrón: los socios no listan users (la UI oculta la pestaña)
 *  3. Primer login: el socio borra su propia pre-inscripción
 *  5. Poder simple: el titular solo puede anular, no editar ni reactivar
 *  6. Votaciones: conteo aparte, invisible para socios hasta el cierre
 *
 * Uso: npm run test:rules (corre después de permisos.test.mjs)
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
  doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, collection, query, where,
  getCountFromServer, runTransaction, writeBatch, increment, serverTimestamp,
} from 'firebase/firestore';

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

/* ─────────────── Sesiones ─────────────── */
adminInit({ projectId: PROJECT }, 'fallas-admin');
const { getApp } = await import('firebase-admin/app');
const admin = adminFirestore(getApp('fallas-admin'));

async function conectar(nombre, email) {
  const app  = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT }, 'f-' + nombre);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://' + AUTH_HOST, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, ...String(process.env.FIRESTORE_EMULATOR_HOST).split(':'));
  const cred = await createUserWithEmailAndPassword(auth, email, 'clave-de-prueba-123');
  return { db, uid: cred.user.uid, email };
}
async function actor(nombre, email, ficha) {
  const a = await conectar(nombre, email);
  if (ficha) await admin.doc('users/' + a.uid).set({ nombre, email, activo: true, estamento: 'Prueba', ...ficha });
  return a;
}

await admin.doc('config/permisos').set({ matriz: MATRIZ, activo: true, version: 2 });
const pres  = await actor('pres',  'f-pres@afusamut.cl',  { rol: 'directorio', cargo: 'Presidente', cargoKey: 'presidente' });
const teso  = await actor('teso',  'f-teso@afusamut.cl',  { rol: 'directorio', cargo: 'Tesorero/a', cargoKey: 'tesorero' });
const secre = await actor('secre', 'f-secre@afusamut.cl', { rol: 'directorio', cargo: 'Secretario/a', cargoKey: 'secretario' });
const socia = await actor('socia', 'f-socia@afusamut.cl', { rol: 'socio', estadoSocio: 'activo' });
const socio2 = await actor('socio2', 'f-socio2@afusamut.cl', { rol: 'socio', estadoSocio: 'activo' });

/* ═══════════════ 1. Inicio del Directorio ═══════════════ */
console.log('\n1. Inicio del Directorio — solo se piden los conteos permitidos');
await admin.doc('mensajes/f-m1').set({ autorUid: 'x', mensaje: 'hola', respuesta: null });
await permite('tesorero cuenta socios activos (KPI con padron.ver)',
  () => getCountFromServer(query(collection(teso.db, 'users'), where('activo', '==', true))));
await permite('tesorero cuenta actas (KPI)',
  () => getCountFromServer(collection(teso.db, 'actas')));
await deniega('tesorero NO cuenta el buzón: por eso la UI ya no lo pide sin buzon.ver',
  () => getCountFromServer(query(collection(teso.db, 'mensajes'), where('respuesta', '==', null))));
await permite('presidente sí cuenta el buzón',
  () => getCountFromServer(query(collection(pres.db, 'mensajes'), where('respuesta', '==', null))));

/* ═══════════════ 2. Padrón ═══════════════ */
console.log('\n2. Padrón — los socios no listan fichas (la UI oculta la pestaña)');
await deniega('la socia NO lista users (RUT, celular y correo de todos)',
  () => getDocs(query(collection(socia.db, 'users'), where('activo', '==', true))));

/* ═══════════════ 3. Primer login ═══════════════ */
console.log('\n3. Primer login — reclamar y limpiar la pre-inscripción');
const nueva = await conectar('nueva', 'f-nueva@afusamut.cl');
await admin.doc('padronPendiente/f-nueva@afusamut.cl').set({ nombre: 'Nueva', email: 'f-nueva@afusamut.cl', estamento: 'TENS' });
await admin.doc('padronPendiente/f-otra@afusamut.cl').set({ nombre: 'Otra', email: 'f-otra@afusamut.cl', estamento: 'TENS' });
await deniega('sin ficha creada, NO puede borrar su pre-inscripción',
  () => deleteDoc(doc(nueva.db, 'padronPendiente', 'f-nueva@afusamut.cl')));
await permite('crea su ficha desde la pre-inscripción (auth.js)',
  () => setDoc(doc(nueva.db, 'users', nueva.uid), {
    nombre: 'Nueva', email: 'f-nueva@afusamut.cl', estamento: 'TENS', rol: 'socio', activo: true, onboardingOk: false,
  }));
await permite('con la ficha creada, borra su propia pre-inscripción',
  () => deleteDoc(doc(nueva.db, 'padronPendiente', 'f-nueva@afusamut.cl')));
await deniega('NO borra la pre-inscripción de otra persona',
  () => deleteDoc(doc(nueva.db, 'padronPendiente', 'f-otra@afusamut.cl')));
await permite('el tesorero limpia una pre-inscripción (limpieza automática del padrón)',
  () => deleteDoc(doc(teso.db, 'padronPendiente', 'f-otra@afusamut.cl')));

/* ═══════════════ 5. Poder simple ═══════════════ */
console.log('\n5. Poder simple — el titular solo puede anular');
const poder = () => ({ uid: socia.uid, nombre: 'Socia', rut: '1-9', monto: 4000, anulado: false });
const p1 = await addDoc(collection(socia.db, 'poderes'), poder());
await deniega('la socia NO cambia el monto de su poder',
  () => updateDoc(doc(socia.db, 'poderes', p1.id), { monto: 1 }));
await permite('la socia anula su propio poder (al reemplazarlo)',
  () => updateDoc(doc(socia.db, 'poderes', p1.id), { anulado: true }));
await deniega('la socia NO reactiva un poder anulado',
  () => updateDoc(doc(socia.db, 'poderes', p1.id), { anulado: false }));
const p2 = await addDoc(collection(socia.db, 'poderes'), poder());
await admin.doc('poderes/' + p2.id).update({ anulado: true });
await deniega('la socia NO revierte una anulación del Directorio ni cambia el monto',
  () => updateDoc(doc(socia.db, 'poderes', p2.id), { anulado: false, monto: 1 }));
await permite('el tesorero (poderes.gestionar) corrige un poder',
  () => updateDoc(doc(teso.db, 'poderes', p2.id), { anulado: false }));
await deniega('otro socio NO anula el poder ajeno',
  () => updateDoc(doc(socio2.db, 'poderes', p2.id), { anulado: true }));

/* ═══════════════ 6. Votaciones ═══════════════ */
console.log('\n6. Votaciones — conteo aparte y oculto hasta el cierre');
const conteo = (db, id) => doc(db, 'votaciones', id, 'escrutinio', 'conteo');
async function crearVotacion(db, id, n = 2) {
  const b = writeBatch(db);
  b.set(doc(db, 'votaciones', id), {
    titulo: 'IPC ' + id, descripcion: '', estado: 'abierta',
    opciones: Array.from({ length: n }, (_, i) => ({ id: i, texto: 'Opción ' + i })),
    participantes: 0, creadoEn: serverTimestamp(),
  });
  b.set(conteo(db, id), Object.fromEntries(Array.from({ length: n }, (_, i) => ['o' + i, 0])));
  await b.commit();
}
// Transacción idéntica a emitirVoto() de portal.js
function votar(a, id, idx, { suma = 1, participacion = true, votante = true, extra = null } = {}) {
  return runTransaction(a.db, async (tx) => {
    const vref = doc(a.db, 'votaciones', id);
    const v = await tx.get(vref);
    tx.update(conteo(a.db, id), { ['o' + idx]: increment(suma), ...(extra || {}) });
    if (participacion) tx.update(vref, { participantes: (v.data().participantes || 0) + 1 });
    if (votante) tx.set(doc(a.db, 'votantes', id + '_' + a.uid), { votacionId: id, uid: a.uid, creadoEn: serverTimestamp() });
  });
}

await permite('la secretaria crea una votación con su escrutinio en cero',
  () => crearVotacion(secre.db, 'fv1'));
await deniega('el tesorero (sin votaciones.gestionar) NO crea votaciones',
  () => crearVotacion(teso.db, 'fv-teso'));
await deniega('la socia NO lee el conteo de una votación abierta',
  () => getDoc(conteo(socia.db, 'fv1')));
await permite('la socia lee la votación (título, opciones, participación)',
  () => getDoc(doc(socia.db, 'votaciones', 'fv1')));
await permite('la secretaria sí ve el conteo mientras está abierta',
  () => getDoc(conteo(secre.db, 'fv1')));

await deniega('NO se puede sumar 2 votos a una opción',
  () => votar(socia, 'fv1', 0, { suma: 2 }));
await deniega('NO se puede votar en dos opciones a la vez',
  () => votar(socia, 'fv1', 0, { extra: { o1: increment(1) } }));
await deniega('NO se puede votar sin sumar la participación',
  () => votar(socia, 'fv1', 0, { participacion: false }));
await deniega('NO se puede votar sin quedar registrada como votante',
  () => votar(socia, 'fv1', 0, { votante: false }));
await deniega('NO se puede sumar participación sin votar',
  () => runTransaction(socia.db, async (tx) => {
    const vref = doc(socia.db, 'votaciones', 'fv1'); const v = await tx.get(vref);
    tx.update(vref, { participantes: (v.data().participantes || 0) + 1 });
    tx.set(doc(socia.db, 'votantes', 'fv1_' + socia.uid), { votacionId: 'fv1', uid: socia.uid, creadoEn: serverTimestamp() });
  }));
await permite('la socia vota con la transacción del portal',
  () => votar(socia, 'fv1', 1));
await deniega('la socia NO vota dos veces',
  () => votar(socia, 'fv1', 0));
await deniega('la socia NO reescribe el conteo directamente',
  () => updateDoc(conteo(socia.db, 'fv1'), { o0: 50 }));
await deniega('la socia NO reescribe las opciones de la votación',
  () => updateDoc(doc(socia.db, 'votaciones', 'fv1'), { opciones: [{ id: 0, texto: 'X' }, { id: 1, texto: 'Y' }] }));
await permite('otro socio vota',
  () => votar(socio2, 'fv1', 0));
const c1 = (await admin.doc('votaciones/fv1/escrutinio/conteo').get()).data();
const v1 = (await admin.doc('votaciones/fv1').get()).data();
anotar(c1.o0 === 1 && c1.o1 === 1 && v1.participantes === 2,
  'conteo y participación quedan consistentes (1 + 1 = 2 votantes)',
  JSON.stringify({ c1, participantes: v1.participantes }));

await permite('la secretaria cierra la votación',
  () => updateDoc(doc(secre.db, 'votaciones', 'fv1'), { estado: 'cerrada' }));
await permite('cerrada, la socia ya puede leer los resultados',
  () => getDoc(conteo(socia.db, 'fv1')));
await deniega('cerrada, nadie más puede votar',
  () => votar(pres, 'fv1', 0));

console.log('\n6b. Votaciones antiguas — migración por quien las administra');
await admin.doc('votaciones/fv-old').set({
  titulo: 'Antigua', estado: 'abierta',
  opciones: [{ id: 0, texto: 'Sí', votos: 3 }, { id: 1, texto: 'No', votos: 2 }],
});
await deniega('la socia NO puede votar en una antigua sin migrar',
  () => votar(socia, 'fv-old', 0));
await permite('la secretaria la migra (conteo aparte + opciones sin votos)',
  async () => {
    const b = writeBatch(secre.db);
    b.set(conteo(secre.db, 'fv-old'), { o0: 3, o1: 2 });
    b.update(doc(secre.db, 'votaciones', 'fv-old'), {
      opciones: [{ id: 0, texto: 'Sí' }, { id: 1, texto: 'No' }], participantes: 5,
    });
    await b.commit();
  });
await permite('migrada, la socia vota normalmente',
  () => votar(socia, 'fv-old', 0));

/* ─────────────── Resultado ─────────────── */
console.log('\n════════════════════════════════════════');
console.log(`Comprobaciones superadas: ${ok} · fallidas: ${fallos.length}`);
if (fallos.length) {
  console.log('\nFALLOS:');
  fallos.forEach(f => console.log('  · ' + f));
  process.exit(1);
}
console.log('Las fallas de la auditoría quedan corregidas en las reglas.');
process.exit(0);
