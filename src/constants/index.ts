import type { Estamento, CalidadSocio } from '@/types';

export const ESTAMENTOS: Estamento[] = [
  'Enfermería',
  'TENS',
  'Conductores',
  'Administrativo',
];

export const CALIDADES_SOCIO: CalidadSocio[] = [
  'Titular',
  'Contrata',
  'Reemplazo',
];

export const CATEGORIAS_BUZON = [
  'Consultas Gremiales',
  'Seguridad y Salud Laboral',
  'Convenios e Incorporación',
  'Apoyo Jurídico / Ley 19.296',
] as const;

export const MINISTROS_FE = [
  'Autogestionado por Directorio',
  'Inspección del Trabajo Talcahuano (Digital)',
] as const;

/** Cuota mensual base en CLP (Art. 28 de los Estatutos) */
export const CUOTA_MENSUAL_BASE = 4_000;

/** Correo oficial del directorio */
export const EMAIL_DIRECTORIO = 'directiva@afusamut.cl';

/** Fecha de constitución */
export const FECHA_CONSTITUCION = '2026-04-09';
