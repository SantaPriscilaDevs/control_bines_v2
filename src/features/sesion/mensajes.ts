import { esErrorApi } from '@/lib/api';

/** Va debajo del título «No se pudo iniciar sesión.», así que no lo repite. */
const REINTENTAR = 'Intente nuevamente. Si el problema persiste, comuníquese con Sistemas.';

/**
 * Mensaje cuando falla el inicio de sesión, en tono formal y sin nombrar sistemas internos. Los
 * códigos son los de `UserLoginController`.
 */
export function mensajeLogin(error: unknown): string {
  if (!esErrorApi(error)) return REINTENTAR;
  if (error.tipo !== 'http') return error.message || REINTENTAR;
  const mensaje = error.mensajeServidor ?? '';
  switch (true) {
    case error.codigo === 422:
      return 'Ingrese un correo válido y una contraseña de al menos 6 caracteres.';
    case error.codigo === 423:
      return 'Su usuario está desactivado. Comuníquese con Sistemas.';
    // El ERP responde 404 tanto a credenciales malas como a la falta de permiso en la aplicación;
    // lo distingue el texto.
    case error.codigo === 404 && /permiso/i.test(mensaje):
      return 'Su usuario no tiene permiso para usar esta aplicación. Comuníquese con Sistemas.';
    case error.codigo === 404:
      return 'Sus credenciales no son correctas. Verifíquelas e intente nuevamente. Si el problema persiste, comuníquese con Sistemas.';
    // Cualquier otro texto del servidor es técnico: no se le muestra al usuario.
    default:
      return REINTENTAR;
  }
}

/** Mensaje cuando falla entrar a una planta. */
export function mensajePlanta(error: unknown): string {
  if (esErrorApi(error) && error.tipo === 'sinConexion') return error.message;
  return 'No se pudieron cargar los datos de la planta. Intente nuevamente. Si el problema persiste, comuníquese con Sistemas.';
}
