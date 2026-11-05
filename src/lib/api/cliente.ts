import { create, type AxiosError } from 'axios';
import { config } from '@/config';
import { ErrorApi, mensajeDelCuerpo } from './errores';

let token: string | null = null;

/** Lo fija la sesión al iniciar, al cargar y al cerrar. Se lee en cada llamada. */
export const fijarToken = (valor: string | null) => {
  token = valor;
};

/** Todo el HTTP de la app pasa por esta instancia. */
export const api = create({
  baseURL: config.urlApi,
  timeout: 30_000,
  // Sin esto, Laravel responde los errores de validación con una redirección.
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(peticion => {
  if (token) peticion.headers.Authorization = `Bearer ${token}`;
  return peticion;
});

api.interceptors.response.use(
  respuesta => respuesta,
  (error: AxiosError) => Promise.reject(normalizar(error)),
);

/** Toda falla llega como [ErrorApi]: sin conexión (sin respuesta) o el código y el motivo del servidor. */
export function normalizar(error: unknown): ErrorApi {
  if (error instanceof ErrorApi) return error;
  const axiosError = error as AxiosError | undefined;
  const respuesta = axiosError?.response;
  if (!respuesta) return ErrorApi.sinConexion();
  return ErrorApi.http(respuesta.status, mensajeDelCuerpo(respuesta.data));
}

/** Cuerpo `application/x-www-form-urlencoded`, como los formularios de la app vieja. */
export function formulario(campos: Record<string, string | number>): string {
  return Object.entries(campos)
    .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`)
    .join('&');
}

export const CABECERA_FORMULARIO = { 'Content-Type': 'application/x-www-form-urlencoded' } as const;

/** POST de formulario: así reciben los datos casi todos los endpoints de `binesMovil`. */
export async function postFormulario<T>(ruta: string, campos: Record<string, string | number>): Promise<T> {
  const { data } = await api.post<T>(ruta, formulario(campos), { headers: CABECERA_FORMULARIO });
  return data;
}

/** Comprueba que llegó un objeto: el ERP a veces responde HTML o texto con HTTP 200. */
export function objeto<T extends object>(data: unknown): T {
  if (!data || typeof data !== 'object') throw ErrorApi.respuesta();
  return data as T;
}

/** Comprueba que llegó una lista. */
export function lista<T>(data: unknown): T[] {
  if (!Array.isArray(data)) throw ErrorApi.respuesta();
  return data as T[];
}

/** URL completa de una ruta de la API (para la foto, que la carga el componente Image). */
export const urlDe = (ruta: string) => `${config.urlApi}${ruta}`;

/** El token actual, para las cargas que no pasan por axios (imágenes). */
export const tokenActual = () => token;
