// Operaciones Firestore compartidas: auditoría y seed de beneficios.
import {
  db, doc, getDoc, addDoc, collection, writeBatch, serverTimestamp,
} from './firebase.js';
import { currentUser, currentUserData } from './auth.js';

export async function logAudit(accion, coleccion = null, docId = null, detalle = {}) {
  if (!currentUser) return;
  try {
    await addDoc(collection(db, 'auditLog'), {
      uid:         currentUser.uid,
      userEmail:   currentUser.email,
      userNombre:  currentUserData?.nombre || currentUser.displayName,
      accion,
      coleccion,
      documentoId: docId,
      detalle,
      creadoEn:    serverTimestamp(),
    });
  } catch (e) { console.error('auditLog:', e); }
}

/* ═══════════ CUOTAS POR ESTAMENTO (config/cuotas) ═══════════ */
const CUOTA_FALLBACK = 5000; // si no hay config o el estamento no está mapeado

let cuotasCache = null; // caché local para no leer Firestore en cada uso

export async function getCuotas() {
  if (cuotasCache) return cuotasCache;
  const snap = await getDoc(doc(db, 'config', 'cuotas'));
  cuotasCache = snap.exists() ? snap.data() : null;
  return cuotasCache;
}

export function invalidarCuotasCache() {
  cuotasCache = null;
}

// Versión síncrona contra una config ya cargada (para pintar tablas)
export function cuotaPorEstamentoSync(estamento, config) {
  if (!config) return CUOTA_FALLBACK;
  for (const cat of config.categorias || []) {
    if ((cat.estamentos || []).some(e => e.toLowerCase() === estamento?.toLowerCase())) {
      return cat.montoCLP;
    }
  }
  return CUOTA_FALLBACK;
}

export async function getCuotaPorEstamento(estamento) {
  return cuotaPorEstamentoSync(estamento, await getCuotas());
}

// Categoría a la que pertenece un estamento (para mostrar el nombre)
export async function getCategoriaCuota(estamento) {
  const config = await getCuotas();
  return (config?.categorias || []).find(c =>
    (c.estamentos || []).some(e => e.toLowerCase() === estamento?.toLowerCase())
  ) || null;
}

// Convenio OPTIMED con detalle completo (también lo usa scripts/agregar-optimed.mjs)
export function OPTIMED_BENEFICIO(ts) {
  return {
    titulo: 'OPTIMED — Salud Visual',
    descripcion: 'Evaluación oftalmológica gratuita por compra de lentes. ' +
                 'Monofocales 20%, bifocales y multifocales 30%, lentes de sol 15%. ' +
                 'Operativos en terreno, mantención gratuita y control preventivo anual. ' +
                 'Atención para beneficiarios desde 8 años y grupo familiar.',
    codigo: 'OPTIMED-AFUSA',
    icono: '👓',
    colorAcento: '#1d6fa5',
    activo: true,
    detalle: {
      beneficiarios: [
        'Trabajadores de la institución',
        'Cónyuge o pareja',
        'Hijos e hijas',
        'Cargas familiares acreditadas',
        'Padres (opcional según convenio)',
      ],
      prestaciones: [
        { item: 'Evaluación visual', desc: 'Oftalmológica gratuita por compra de lentes ópticos' },
        { item: 'Lentes monofocales', desc: '20% de descuento' },
        { item: 'Lentes bifocales y multifocales', desc: '30% de descuento' },
        { item: 'Lentes de sol', desc: '15% de descuento' },
        { item: 'Operativos en terreno', desc: 'Atención y entrega de lentes en el lugar de trabajo sin costo' },
        { item: 'Mantención gratuita', desc: 'Ajuste, alineación, limpieza y cambio de tornillos' },
        { item: 'Cambio de plaquetas', desc: 'Sin costo' },
        { item: 'Control preventivo', desc: 'Control anual gratuito' },
        { item: 'Certificados para reembolso', desc: 'Boletas y documentación para FONASA, ISAPRE y seguros complementarios' },
      ],
      garantias: [
        'Garantía de fabricación de hasta 6 meses por falla de material',
        'Reparación o evaluación sin costo por fallas de fabricación',
        'Reposición preferencial por pérdida o rotura',
        'Seguimiento y apoyo post entrega',
      ],
      contacto: {
        representante: 'Sra. Jessica Hernández Rivas',
        direccion: 'Galería Colo-Colo 454, Local 18 — Concepción',
        celular: '+56 9 4131 7972',
      },
      vigencia: 'Duración indefinida. Puede finalizar con aviso escrito de 30 días de anticipación.',
    },
    creadoEn: ts,
  };
}

// Siembra los convenios base una sola vez (flag en config/beneficios_seed).
// Solo la ejecuta el directorio/superadmin: las rules bloquean a los socios.
export async function seedBeneficios() {
  const flagRef = doc(db, 'config', 'beneficios_seed');
  const flag    = await getDoc(flagRef);
  if (flag.exists() && flag.data().sembrado) return;

  const beneficios = [
    {
      titulo: 'Farmacias Red Popular',
      descripcion: '15% en catálogo + 5% en críticos para socios y cargas.',
      codigo: 'POP-AFUSA',
      icono: '💊',
      colorAcento: '#3b82f6',
      activo: true,
      creadoEn: serverTimestamp(),
    },
    {
      titulo: 'Cabañas Tomé-Dichato',
      descripcion: 'Hasta 30% de rebaja fuera de temporada.',
      codigo: 'DICH-AFUSAMUT',
      icono: '🏖️',
      colorAcento: '#8b5cf6',
      activo: true,
      creadoEn: serverTimestamp(),
    },
    {
      titulo: 'Capacitación Prehospitalaria',
      descripcion: 'Becas del 20% en Reanimación Avanzada.',
      codigo: 'ACAD-SAMU26',
      icono: '🎓',
      colorAcento: '#D1A126',
      activo: true,
      creadoEn: serverTimestamp(),
    },
    OPTIMED_BENEFICIO(serverTimestamp()),
  ];

  const batch = writeBatch(db);
  beneficios.forEach(b => batch.set(doc(collection(db, 'beneficios')), b));
  batch.set(flagRef, { sembrado: true });
  await batch.commit();
}
