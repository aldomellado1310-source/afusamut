// ════════════════════════════════════════════════════════════════════════════
// CONTROL DE PERMISOS POR CARGO (Ley 19.296 — funciones del Directorio)
// ────────────────────────────────────────────────────────────────────────────
// El rol `directorio` daba históricamente acceso total. Este módulo separa el
// ROL (quién entra al panel) del CARGO (qué puede hacer dentro), de modo que
// la Tesorería administre finanzas y padrón, la Secretaría lleve actas y
// comunicaciones, y la Presidencia tenga visión completa.
//
// La matriz vive en Firestore (config/permisos) para que el superadmin la
// edite sin desplegar código; las MISMAS reglas se aplican en firestore.rules
// (que lee ese documento) y en storage.rules (vía custom claim `perm`).
// ════════════════════════════════════════════════════════════════════════════
import { db, doc, getDoc, setDoc, serverTimestamp } from './firebase.js';

/* ─────────────── CATÁLOGO DE PERMISOS ─────────────── */
// `codigo` es el alias corto que viaja en el custom claim del token (los
// claims tienen un tope de 1000 bytes; los ids largos no caben).
export const PERMISOS = [
  { id: 'padron.ver',           codigo: 'pv', area: 'Padrón',       label: 'Ver el padrón completo',            desc: 'Consultar la nómina de socios con RUT, estamento y estado de cuota.' },
  { id: 'padron.gestionar',     codigo: 'pg', area: 'Padrón',       label: 'Añadir y quitar miembros',          desc: 'Inscribir socios, editar fichas, registrar renuncias y reincorporaciones.', sensible: true },
  { id: 'finanzas.gestionar',   codigo: 'fg', area: 'Finanzas',     label: 'Administrar el libro de caja',      desc: 'Registrar y eliminar ingresos y egresos, y marcar cuotas pagadas.', sensible: true },
  { id: 'cuotas.configurar',    codigo: 'cc', area: 'Finanzas',     label: 'Configurar el valor de las cuotas', desc: 'Definir los montos por estamento que aplica el portal.', sensible: true },
  { id: 'respaldos.ver',        codigo: 'rv', area: 'Finanzas',     label: 'Ver respaldos de rendición',        desc: 'Abrir las boletas, facturas y documentos adjuntos.' },
  { id: 'respaldos.subir',      codigo: 'rs', area: 'Finanzas',     label: 'Subir respaldos (imagen o PDF)',    desc: 'Adjuntar boletas y documentos de respaldo al libro de caja.' },
  { id: 'mural.publicar',       codigo: 'mp', area: 'Comunicación', label: 'Publicar en el Diario Mural',       desc: 'Crear, editar y eliminar avisos del mural visible para todos los socios.' },
  { id: 'mensajeria.enviar',    codigo: 'me', area: 'Comunicación', label: 'Enviar mensajes a socios',          desc: 'Comunicados in-app del Directorio, individuales o masivos.' },
  { id: 'buzon.ver',            codigo: 'bv', area: 'Comunicación', label: 'Leer y responder el buzón',         desc: 'Acceder a las consultas y reclamos que envían los socios.' },
  { id: 'actas.gestionar',      codigo: 'ag', area: 'Gobierno',     label: 'Redactar y publicar actas',         desc: 'Levantar actas de asamblea y directorio, publicarlas o eliminarlas.' },
  { id: 'votaciones.gestionar', codigo: 'vg', area: 'Gobierno',     label: 'Administrar votaciones',            desc: 'Crear y cerrar votaciones, y auditar el escrutinio.' },
  { id: 'poderes.ver',          codigo: 'qv', area: 'Gobierno',     label: 'Ver los Poderes Simples',           desc: 'Consultar las autorizaciones de descuento por planilla de todos los socios.' },
  { id: 'poderes.gestionar',    codigo: 'qg', area: 'Gobierno',     label: 'Administrar Poderes Simples',       desc: 'Anular o corregir poderes simples ya emitidos.', sensible: true },
  { id: 'calendario.gestionar', codigo: 'kg', area: 'Gobierno',     label: 'Administrar el calendario',         desc: 'Agregar y eliminar eventos gremiales.' },
  { id: 'beneficios.gestionar', codigo: 'bg', area: 'Gobierno',     label: 'Administrar convenios',             desc: 'Publicar, editar y desactivar beneficios para socios.' },
  { id: 'auditoria.ver',        codigo: 'av', area: 'Control',      label: 'Ver auditoría y permisos',          desc: 'Acceder al registro de actividad y al panel de derechos del Directorio.' },
];

export const AREAS = ['Padrón', 'Finanzas', 'Comunicación', 'Gobierno', 'Control'];

export const IDS_PERMISOS = PERMISOS.map(p => p.id);
const POR_ID = new Map(PERMISOS.map(p => [p.id, p]));
export const permisoInfo = (id) => POR_ID.get(id) || null;

// Permisos que solo debería ejercer UNA persona a la vez (control de
// concentración de poder: el panel avisa si hay más de un titular).
export const PERMISOS_EXCLUSIVOS = ['finanzas.gestionar', 'padron.gestionar', 'cuotas.configurar'];

/* ─────────────── CARGOS ─────────────── */
export const CARGOS_BASE = [
  { key: 'presidente',     label: 'Presidente',     icono: '⚖️' },
  { key: 'vicepresidente', label: 'Vicepresidente', icono: '🤝' },
  { key: 'secretario',     label: 'Secretario/a',   icono: '✍️' },
  { key: 'tesorero',       label: 'Tesorero/a',     icono: '💰' },
  { key: 'director',       label: 'Director/a',     icono: '🎖️' },
  { key: 'sin-cargo',      label: 'Sin cargo',      icono: '👤' },
];

// "Secretario/a" -> 'secretario'; "Delegado/a de Bienestar" -> 'delegado-de-bienestar'
export function slugCargo(cargo) {
  if (!cargo) return 'sin-cargo';
  return String(cargo)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\/(as?|os?)\b/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-cargo';
}

export function etiquetaCargo(key) {
  const base = CARGOS_BASE.find(c => c.key === key);
  if (base) return base.label;
  return String(key || 'sin-cargo').replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export function iconoCargo(key) {
  return (CARGOS_BASE.find(c => c.key === key) || {}).icono || '🏷️';
}

/* ─────────────── MATRIZ POR DEFECTO ─────────────── */
// Reparto estatutario de funciones:
//  · Tesorería   → única con finanzas, cuotas, padrón y carga de respaldos.
//  · Presidencia → visión completa (todos los permisos de lectura) y mural.
//  · Secretaría  → actas, comunicaciones, calendario y mural.
//  · Los demás   → lectura del padrón y participación, sin gestión.
export const MATRIZ_DEFAULT = Object.freeze({
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
  vicepresidente: [
    'padron.ver', 'respaldos.ver', 'buzon.ver', 'calendario.gestionar',
  ],
  director: [
    'padron.ver', 'respaldos.ver',
  ],
  'sin-cargo': [
    'padron.ver',
  ],
});

export function matrizPorDefecto() {
  return Object.fromEntries(Object.entries(MATRIZ_DEFAULT).map(([k, v]) => [k, [...v]]));
}

/* ─────────────── CARGA Y GUARDADO DE LA CONFIGURACIÓN ─────────────── */
const REF = () => doc(db, 'config', 'permisos');

// undefined = aún no consultado; null = el documento no existe todavía.
let cache;

export async function cargarPermisos({ forzar = false } = {}) {
  if (!forzar && cache !== undefined) return cache;
  try {
    const snap = await getDoc(REF());
    cache = snap.exists() ? snap.data() : null;
  } catch (e) {
    // Sin lectura (o sin red) se asume el comportamiento histórico: rol pleno.
    console.warn('config/permisos:', e.code || e.message);
    cache = null;
  }
  return cache;
}

export function invalidarPermisosCache() { cache = undefined; }

export function configPermisos() { return cache === undefined ? null : cache; }

// El control solo rige cuando el documento existe Y está activado. Mientras
// esté apagado, todo el directorio conserva los permisos de siempre: así la
// migración no deja al gremio sin poder operar.
export function controlActivo() {
  const cfg = configPermisos();
  return !!(cfg && cfg.activo === true);
}

export function matrizActual() {
  const cfg = configPermisos();
  return cfg && cfg.matriz ? cfg.matriz : matrizPorDefecto();
}

export function permisosDeCargo(cargoKey) {
  const lista = matrizActual()[cargoKey || 'sin-cargo'];
  return Array.isArray(lista) ? lista : [];
}

// ¿El cargo `cargoKey` tiene el permiso `permisoId`, según la configuración ya
// cargada? Función pura: no mira la sesión (de eso se encarga portal.js).
export function cargoPuede(cargoKey, permisoId) {
  if (!controlActivo()) return true;
  return permisosDeCargo(cargoKey).includes(permisoId);
}

// Códigos cortos para el custom claim que consume storage.rules.
export function codigosDe(permisosIds) {
  return (permisosIds || []).map(id => POR_ID.get(id)?.codigo).filter(Boolean);
}

export async function guardarConfigPermisos({ matriz, activo, actualizadoPor }) {
  const limpia = {};
  for (const [k, v] of Object.entries(matriz || {})) {
    limpia[slugCargo(k)] = (Array.isArray(v) ? v : []).filter(id => POR_ID.has(id));
  }
  const payload = {
    matriz:         limpia,
    activo:         !!activo,
    version:        2,
    actualizadoEn:  serverTimestamp(),
    actualizadoPor: actualizadoPor || null,
  };
  await setDoc(REF(), payload);
  invalidarPermisosCache();
  return payload;
}
