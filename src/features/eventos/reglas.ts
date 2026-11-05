import { grupoDe, type Direccion, type Evento } from './catalogo';

/** Una o dos letras, un dígito opcional y al menos seis más: el `GUIA_REF_PATTERN` de la app vieja. */
const GUIA = /^[A-Za-z]{1,2}\d?\d{6,}$/;

/** Se aplica igual al gatillo y a lo escrito a mano (la app vieja no revisaba lo escrito). */
export const esGuia = (texto: string): boolean => GUIA.test(texto.trim());

export const textoBoton = (e: Evento): string =>
  e.boton === 'Sin pesca' || e.boton === 'Con pesca' ? 'Registrar llegada' : `Registrar ${e.boton.toLowerCase()}`;

/** «Ingreso registrado», «Fin registrado», «Llegada registrada». */
export const textoRegistrado = (e: Evento): string =>
  e.boton === 'Sin pesca' || e.boton === 'Con pesca' ? 'Llegada registrada' : `${e.boton} registrado`;

/**
 * En garitas, llegadas y despachos se compara la guía con el camión: chofer y vehículo van primero.
 * En pesca, calidad, recepción y las llegadas con pesca importa de dónde viene: los datos de pesca.
 */
export function vehiculoPrimero(e: Evento): boolean {
  const grupo = grupoDe(e).titulo;
  if (e.boton === 'Con pesca') return false;
  return !['Pesca', 'Análisis', 'Recepción'].some(prefijo => grupo.startsWith(prefijo));
}

/**
 * Texto para el usuario de lo que respondió el servidor al rechazar un registro. Los mensajes del
 * servidor son técnicos y a veces engañosos: se reconocen los conocidos y el resto queda en un
 * aviso genérico. [direccion] es la del evento, para decir «ingreso» o «salida».
 */
export function motivoRechazo(texto: string | null | undefined, direccion?: Direccion): string {
  const motivo = (texto ?? '').trim().toLowerCase();
  const que =
    motivo === 'movimiento control de calidad duplicado'
      ? 'análisis de calidad'
      : motivo === 'movimiento despacho de meta duplicado'
        ? 'despacho de meta'
        : motivo === 'movimiento planta hielo duplicado'
          ? 'garita interna'
          : null;
  if (motivo === 'movimiento duplicado') {
    return 'Esta guía ya tiene registrado este mismo evento como último movimiento. No se puede registrar dos veces seguidas.';
  }
  if (que) {
    if (direccion === 'ingreso') return `Esta guía ya tiene registrado el ingreso de ${que}.`;
    if (direccion === 'salida') return `Esta guía ya tiene registrada la salida de ${que}.`;
    return `Esta guía ya tiene registrado este movimiento de ${que}.`;
  }
  if (motivo === 'no se ha disparado un ingreso previo') {
    return 'Esta guía no tiene un ingreso registrado. Registre primero el ingreso.';
  }
  return 'El registro no fue aceptado. Comuníquese con Sistemas.';
}

/** «2026-11-03 10:42:15» → «10:42». */
export const horaDe = (fechaHora: string): string => fechaHora.slice(11, 16);

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha y hora local en `yyyy-MM-dd HH:mm:ss` (24 h), como la espera el ERP. */
export function fechaHoraLocal(momento: Date = new Date()): string {
  return `${diaLocal(momento)} ${dos(momento.getHours())}:${dos(momento.getMinutes())}:${dos(momento.getSeconds())}`;
}

/** `yyyy-MM-dd` en hora local. */
export function diaLocal(momento: Date = new Date()): string {
  return `${momento.getFullYear()}-${dos(momento.getMonth() + 1)}-${dos(momento.getDate())}`;
}
