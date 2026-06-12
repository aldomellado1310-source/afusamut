import type { Movimiento } from '@/types';

/** Suma todos los ingresos */
export function calcularTotalIngresos(movimientos: Movimiento[]): number {
  return movimientos
    .filter(m => m.tipo === 'Ingreso')
    .reduce((acc, m) => acc + m.monto, 0);
}

/** Suma todos los egresos */
export function calcularTotalEgresos(movimientos: Movimiento[]): number {
  return movimientos
    .filter(m => m.tipo === 'Egreso')
    .reduce((acc, m) => acc + m.monto, 0);
}

/** Saldo neto disponible en caja */
export function calcularCajaDisponible(movimientos: Movimiento[]): number {
  return calcularTotalIngresos(movimientos) - calcularTotalEgresos(movimientos);
}

/** Formatea un monto a pesos chilenos */
export function formatearPesos(monto: number): string {
  return `$${monto.toLocaleString('es-CL')}`;
}
