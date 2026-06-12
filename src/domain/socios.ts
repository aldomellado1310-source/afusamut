import type { Socio, Estamento } from '@/types';

/** Filtra socios por nombre/RUT y estamento */
export function filtrarSocios(
  socios: Socio[],
  busqueda: string,
  estamento: Estamento | 'Todos'
): Socio[] {
  return socios.filter(s => {
    const matchBusqueda =
      s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.rut.includes(busqueda);
    const matchEstamento = estamento === 'Todos' || s.estamento === estamento;
    return matchBusqueda && matchEstamento;
  });
}

/** Socios con cuota pendiente */
export function sociosMorosos(socios: Socio[]): Socio[] {
  return socios.filter(s => s.pagoCuota === 'Pendiente');
}

/** Total de cuotas mensuales recaudadas del padrón activo */
export function calcularRecaudacionMensual(
  socios: Socio[],
  cuotaMensual: number
): number {
  return socios.filter(s => s.pagoCuota === 'Al Día').length * cuotaMensual;
}

/** Genera el código de afiliado (AFUS-001, AFUS-002...) */
export function codigoAfiliado(id: number): string {
  return `AFUS-${String(id).padStart(3, '0')}`;
}
