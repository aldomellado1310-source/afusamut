// ─── Socio ────────────────────────────────────────────────────────────────────
export type Estamento = 'Enfermería' | 'TENS' | 'Conductores' | 'Administrativo';
export type CalidadSocio = 'Titular' | 'Contrata' | 'Reemplazo';
export type EstadoCuota = 'Al Día' | 'Pendiente';

export interface Socio {
  id: string;
  rut: string;
  nombre: string;
  estamento: Estamento;
  cargo: string;
  calidad: CalidadSocio;
  pagoCuota: EstadoCuota;
  cuotasPagadas: number;
  email?: string;
  fechaAfiliacion?: string;
}

// ─── Finanzas ─────────────────────────────────────────────────────────────────
export type TipoMovimiento = 'Ingreso' | 'Egreso';

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  concepto: string;
  monto: number;
  fecha: string;
  registradoPor?: string;
}

// ─── Votaciones ───────────────────────────────────────────────────────────────
export type EstadoVotacion = 'Activa' | 'Finalizada';

export interface Votacion {
  id: string;
  titulo: string;
  tipo: string;
  estado: EstadoVotacion;
  votosRecibidos: number;
  padronTotal: number;
  opciones: string[];
  votosPorOpcion: number[];
  ministroFe: string;
  fechaInicio?: string;
  fechaCierre?: string;
}

// ─── Buzón ─────────────────────────────────────────────────────────────────────
export type EstadoTicket = 'Pendiente' | 'Resuelto';

export interface Ticket {
  id: string;
  socio: string;
  socioUid?: string;
  categoria: string;
  mensaje: string;
  fecha: string;
  estado: EstadoTicket;
  respuesta?: string | null;
}

// ─── Convenios ────────────────────────────────────────────────────────────────
export interface Convenio {
  id: string;
  tipo: string;
  titulo: string;
  texto: string;
  codigo: string;
  activo: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export type RolUsuario = 'admin' | 'socio';
