import {
  evento,
  ID_EXPORTACION,
  ID_GUIAS_VIRTUALES,
  ID_INGRESO_REMISION,
  ID_SALIDA_REMISION,
  ID_VALIDAR_PERSONAL,
} from '@/features/eventos/catalogo';
import type { RootStackParamList } from './tipos';

type Destino = { [R in keyof RootStackParamList]: RootStackParamList[R] extends undefined ? [R] : [R, RootStackParamList[R]] }[keyof RootStackParamList];

/** A qué pantalla lleva cada opción del menú del ERP, o null si esta app no la tiene. */
export function destinoDe(idOpcion: number | null): Destino | null {
  if (idOpcion == null) return null;
  if (evento(idOpcion)) return ['Captura', { idEvento: idOpcion }];
  switch (idOpcion) {
    case ID_EXPORTACION:
      return ['Exportacion'];
    case ID_SALIDA_REMISION:
      return ['Remision', { ingreso: false }];
    case ID_INGRESO_REMISION:
      return ['Remision', { ingreso: true }];
    case ID_VALIDAR_PERSONAL:
      return ['ValidarPersonal'];
    case ID_GUIAS_VIRTUALES:
      return ['GuiasVirtuales'];
    default:
      return null;
  }
}
