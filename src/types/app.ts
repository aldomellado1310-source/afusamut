import type { Socio, Movimiento, Votacion, Ticket } from './index';

/** Socio con ID numérico local (antes de persistir en Firestore) */
export type SocioLocal = Omit<Socio, 'id'> & { id: number };

/** Movimiento con ID numérico local */
export type MovimientoLocal = Omit<Movimiento, 'id'> & { id: number };

/** Votación con ID numérico local + flag UI de voto emitido */
export type VotacionLocal = Omit<Votacion, 'id'> & { id: number; votoEmitido?: boolean };

/** Ticket con ID numérico local */
export type TicketLocal = Omit<Ticket, 'id'> & { id: number };

export type RolPortal = 'admin' | 'socio';
export type VistaApp  = 'landing' | 'portal';

export type TriggerToast = (message: string, type?: 'success' | 'error') => void;
