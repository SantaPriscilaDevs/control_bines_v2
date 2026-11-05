import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Lectura de bines de una guía de remisión. */
export interface ParamsLecturaGuia {
  guia: string;
  serie: string;
  ingreso: boolean;
  /** Bines que lleva la guía; 0 si no se sabe (escrita a mano sin conexión). */
  bines: number;
  /** La guía se escribió a mano sin conexión: lo leído se guarda en el equipo. */
  sinConexion?: boolean;
  devolucion?: boolean;
}

export type RootStackParamList = {
  Login: undefined;
  Planta: undefined;
  /** Inicio, Historial y Perfil, con la barra de abajo. */
  Principal: undefined;
  /** Elegir otra planta desde Perfil, sin cerrar la sesión. */
  CambiarPlanta: undefined;
  Captura: { idEvento: number };
  Remision: { ingreso: boolean };
  LecturaGuia: ParamsLecturaGuia;
  Exportacion: undefined;
  ValidarPersonal: undefined;
  GuiasVirtuales: undefined;
  PdfGuiaVirtual: { codigo: string };
};

export type PantallaProps<R extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, R>;

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
