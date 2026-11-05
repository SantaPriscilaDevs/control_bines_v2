import { grupoDe, type Evento } from '@/features/eventos/catalogo';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «lunes 3 de noviembre». */
export const fechaLarga = (fecha: Date = new Date()) => `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;

/** «3 nov 2026». */
export const fechaCorta = (fecha: Date) => `${fecha.getDate()} ${MESES[fecha.getMonth()].slice(0, 3)} ${fecha.getFullYear()}`;

/** «Hoy», «Ayer» o «Lunes 2 de noviembre». */
export function fechaRelativa(fecha: Date): string {
  const hoy = new Date();
  const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mismoDia(fecha, hoy)) return 'Hoy';
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (mismoDia(fecha, ayer)) return 'Ayer';
  const texto = fechaLarga(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * El botón para repetir el último registro, como en el diseño: «Otro ingreso en garita planta»,
 * «Otra salida de garita camaronera», «Otra llegada con pesca».
 */
export function textoRepetir(e: Evento): string {
  const grupo = grupoDe(e).titulo.toLowerCase();
  switch (e.boton) {
    case 'Sin pesca':
    case 'Con pesca':
      return `Otra llegada ${e.boton.toLowerCase()}`;
    case 'Salida':
      return `Otra salida de ${grupo}`;
    case 'Inicio':
    case 'Fin':
      return `Otro ${e.boton.toLowerCase()} de ${grupo}`;
    default: {
      const preposicion = grupo.startsWith('análisis') || grupo.startsWith('despacho') ? 'a' : 'en';
      return `Otro ingreso ${preposicion} ${grupo}`;
    }
  }
}
