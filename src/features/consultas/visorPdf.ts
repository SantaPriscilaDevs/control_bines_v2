import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface PaginaPdf {
  uri: string;
  ancho: number;
  alto: number;
}

declare class VisorPdfModule extends NativeModule {
  renderizar(base64: string, ancho: number): Promise<PaginaPdf[]>;
}

/** El visor nativo (`modules/visor-pdf`). Null si la compilación instalada todavía no lo trae. */
export const VisorPdf = requireOptionalNativeModule<VisorPdfModule>('VisorPdf');
