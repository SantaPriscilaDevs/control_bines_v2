import Constants from 'expo-constants';

/**
 * Datos de la compilación. `EXPO_PUBLIC_API_URL` sale del `.env` y Metro lo escribe en el bundle;
 * la variante y la versión, de `app.config.ts`.
 */
const urlApi = process.env.EXPO_PUBLIC_API_URL ?? '';

export const config = {
  /** API del ERP, terminando en `/api/auth/`. */
  urlApi: urlApi.endsWith('/') ? urlApi : `${urlApi}/`,
  version: Constants.expoConfig?.version ?? '0.0.0',
  variante: (Constants.expoConfig?.extra?.variante as string | undefined) ?? 'development',
  get esDesarrollo(): boolean {
    return this.variante !== 'production';
  },
  /** El servidor sin la ruta, para la etiqueta de desarrollo del Ingreso. */
  get servidor(): string {
    return urlApi.replace(/^https?:\/\//, '').split('/')[0] ?? '';
  },
} as const;
