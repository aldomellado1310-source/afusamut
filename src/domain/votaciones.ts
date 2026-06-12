import type { Votacion } from '@/types';

/** Porcentaje de participación de una votación */
export function calcularParticipacion(votacion: Votacion): number {
  if (votacion.padronTotal === 0) return 0;
  return Math.round((votacion.votosRecibidos / votacion.padronTotal) * 100);
}

/** Porcentaje de votos por opción */
export function calcularPorcentajeOpcion(votos: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((votos / total) * 100);
}

/** Opción ganadora de una votación finalizada */
export function obtenerGanador(votacion: Votacion): string | null {
  if (votacion.estado !== 'Finalizada') return null;
  const max = Math.max(...votacion.votosPorOpcion);
  const idx = votacion.votosPorOpcion.indexOf(max);
  return votacion.opciones[idx] ?? null;
}

/** Verifica si hay quórum suficiente para validar la votación */
export function tieneQuorum(votacion: Votacion, porcentajeMinimo = 50): boolean {
  return calcularParticipacion(votacion) >= porcentajeMinimo;
}
