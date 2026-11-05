/** Por qué falló una llamada al ERP, con un mensaje ya listo para el usuario. */
export type TipoError = 'sinConexion' | 'http' | 'respuesta';

export class ErrorApi extends Error {
  readonly tipo: TipoError;
  /** Código HTTP, o el `status` del cuerpo en los endpoints que responden 200 con el error dentro. */
  readonly codigo?: number;
  /** El `message`, `cause` o `msg` del cuerpo, si vino. */
  readonly mensajeServidor?: string;

  constructor(tipo: TipoError, mensaje: string, codigo?: number, mensajeServidor?: string) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.tipo = tipo;
    this.codigo = codigo;
    this.mensajeServidor = mensajeServidor;
  }

  static sinConexion(): ErrorApi {
    return new ErrorApi('sinConexion', 'No se pudo conectar con el servidor. Revise la conexión e intente nuevamente.');
  }

  static http(codigo: number, mensajeServidor?: string): ErrorApi {
    return new ErrorApi('http', mensajeHttp(codigo, mensajeServidor), codigo, mensajeServidor);
  }

  static respuesta(): ErrorApi {
    return new ErrorApi('respuesta', 'La respuesta del servidor no es válida. Comuníquese con Sistemas.');
  }
}

export const esErrorApi = (error: unknown): error is ErrorApi => error instanceof ErrorApi;

/** El mensaje de un error cualquiera, o [porDefecto]. */
export const mensajeDe = (error: unknown, porDefecto: string): string =>
  error instanceof Error && error.message ? error.message : porDefecto;

/**
 * Un 4xx trae el motivo de negocio del servidor («Embarque ya registrado»): se muestra. Un 5xx trae
 * texto técnico: no se muestra.
 */
function mensajeHttp(codigo: number, mensajeServidor?: string): string {
  if (codigo === 401) return 'Su sesión ya no es válida. Cambie de usuario e ingrese nuevamente.';
  if (codigo >= 500) return 'El servidor tuvo un problema. Intente nuevamente. Si el problema persiste, comuníquese con Sistemas.';
  return mensajeServidor ?? `El servidor rechazó la solicitud (${codigo}). Comuníquese con Sistemas.`;
}

/**
 * Laravel responde `{"error": true, "message": "..."}` o `{"message": "..."}`; los endpoints de
 * `binesMovil` mandan el motivo en `cause` y un título genérico en `msg`.
 */
export function mensajeDelCuerpo(cuerpo: unknown): string | undefined {
  let objeto = cuerpo;
  if (typeof cuerpo === 'string') {
    if (!cuerpo.trim()) return undefined;
    try {
      objeto = JSON.parse(cuerpo);
    } catch {
      return undefined;
    }
  }
  if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) return undefined;
  const registro = objeto as Record<string, unknown>;
  for (const clave of ['message', 'cause', 'msg']) {
    const valor = registro[clave];
    if (typeof valor === 'string' && valor.trim()) return valor;
  }
  return undefined;
}

/**
 * Respuesta `{status, msg, error, cause}` de los endpoints que informan el resultado en el cuerpo
 * con HTTP 200. `error` y `cause` pueden venir como texto o como objeto vacío.
 */
export interface RespuestaEstado {
  status?: number;
  msg?: string | null;
  error?: unknown;
  cause?: unknown;
}

export const exito = (respuesta: RespuestaEstado): boolean => Number(respuesta?.status) === 200;

/** El motivo concreto que manda el servidor, o su mensaje general. */
export function motivoDe(respuesta: RespuestaEstado): string | undefined {
  for (const valor of [respuesta?.error, respuesta?.cause]) {
    if (typeof valor === 'string' && valor.trim()) return valor;
  }
  return typeof respuesta?.msg === 'string' && respuesta.msg.trim() ? respuesta.msg : undefined;
}

/** Los guardados que responden 200 con el resultado en el cuerpo: falla si no fue un éxito. */
export function comprobar(respuesta: RespuestaEstado): void {
  if (!exito(respuesta)) throw ErrorApi.http(Number(respuesta?.status) || 400, motivoDe(respuesta));
}
