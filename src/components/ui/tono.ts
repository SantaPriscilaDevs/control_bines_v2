import type { ColorToken } from '@/styles/theme';
import type { IconName } from './Icon';

/**
 * Tono semántico de etiquetas, avisos y mosaicos. El rojo (`danger`) es solo para errores;
 * `neutral` es para lo que no es un estado (una lista vacía no es un éxito).
 */
export type Tono = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

export const TONOS: Record<Tono, { contenido: ColorToken; fondo: ColorToken; icono: IconName }> = {
  success: { contenido: 'success', fondo: 'successSubtle', icono: 'circle-check' },
  warning: { contenido: 'warning', fondo: 'warningSubtle', icono: 'triangle-alert' },
  danger: { contenido: 'danger', fondo: 'dangerSubtle', icono: 'triangle-alert' },
  info: { contenido: 'info', fondo: 'infoSubtle', icono: 'info' },
  primary: { contenido: 'primary', fondo: 'primarySubtle', icono: 'info' },
  neutral: { contenido: 'textMuted', fondo: 'surfaceContainer', icono: 'info' },
};

/**
 * Sentido de un movimiento: verde para el ingreso y rojo para la salida, relleno y con texto
 * blanco. Siempre lleva además la flecha y el texto.
 */
export type Sentido = 'ingreso' | 'salida';

export const SENTIDOS: Record<Sentido, { fondo: ColorToken; contenido: ColorToken; icono: IconName }> = {
  ingreso: { fondo: 'ingreso', contenido: 'onIngreso', icono: 'log-in' },
  salida: { fondo: 'salida', contenido: 'onSalida', icono: 'log-out' },
};
