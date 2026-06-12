// Migración puntual: agrega el convenio OPTIMED a 'beneficios' en producción
// (el flag config/beneficios_seed ya está activo, así que seedBeneficios no corre).
// Idempotente: si ya existe un beneficio con código OPTIMED-AFUSA, no hace nada.
// Uso: node scripts/agregar-optimed.mjs
// Nota: el objeto duplica OPTIMED_BENEFICIO de public/js/db.js (ese módulo importa
// el SDK por CDN y no puede cargarse en Node).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serviceAccount = JSON.parse(readFileSync(join(root, 'serviceAccountKey.json'), 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const existente = await db.collection('beneficios')
  .where('codigo', '==', 'OPTIMED-AFUSA').limit(1).get();

if (!existente.empty) {
  console.log('OPTIMED ya existe (beneficios/' + existente.docs[0].id + ') — sin cambios.');
  process.exit(0);
}

const ref = await db.collection('beneficios').add({
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
  creadoEn: FieldValue.serverTimestamp(),
});
console.log('✅ OPTIMED agregado: beneficios/' + ref.id);
process.exit(0);
