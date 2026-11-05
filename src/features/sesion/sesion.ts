import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { api, fijarToken, lista, objeto, postFormulario } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { usePreferencias } from '@/lib/storage/preferencias';
import { leerCamaroneras, leerEstablecimientos, leerMenu, type Camaronera, type OpcionMenu, type Planta, type PlantaDisponible } from './menu';

/** Id de CtrlBines en la tabla de aplicaciones del portal: el login lo exige. */
const APLICACION = '2';

export type EstadoSesion =
  | { tipo: 'sinSesion' }
  /** Inició sesión, pero falta elegir la planta. */
  | { tipo: 'sinPlanta'; nombre: string; correo: string }
  | { tipo: 'activa'; nombre: string; correo: string; planta: Planta; opciones: OpcionMenu[] };

/** Lo que se guarda cifrado: el token y quién es. */
interface SesionGuardada {
  token: string;
  nombre: string;
  correo: string;
  planta?: Planta;
}

const CLAVE_SESION = 'sesion';

/** Catálogos de la planta: no son secretos y pueden pasar del límite cómodo del almacén cifrado. */
const CLAVES_PLANTA = {
  menu: 'planta.menu',
  tiposGuia: 'planta.tiposGuia',
  motivosGuia: 'planta.motivosGuia',
  camaroneras: 'planta.camaroneras',
} as const;

function leerGuardada(): SesionGuardada | null {
  try {
    const texto = SecureStore.getItem(CLAVE_SESION);
    const guardada = texto ? (JSON.parse(texto) as SesionGuardada) : null;
    return guardada?.token ? guardada : null;
  } catch {
    return null;
  }
}

function estadoDe(guardada: SesionGuardada | null): EstadoSesion {
  if (!guardada) return { tipo: 'sinSesion' };
  if (!guardada.planta) return { tipo: 'sinPlanta', nombre: guardada.nombre, correo: guardada.correo };
  return {
    tipo: 'activa',
    nombre: guardada.nombre,
    correo: guardada.correo,
    planta: guardada.planta,
    opciones: leerMenu(Storage.getItemSync(CLAVES_PLANTA.menu)),
  };
}

const inicial = leerGuardada();
fijarToken(inicial?.token ?? null);

interface Sesion {
  estado: EstadoSesion;
}

/** La sesión se lee de forma sincrónica al arrancar: el primer cuadro ya sabe a qué pantalla ir. */
export const useSesion = create<Sesion>(() => ({ estado: estadoDe(inicial) }));

function guardar(sesion: SesionGuardada | null): void {
  if (sesion) {
    SecureStore.setItem(CLAVE_SESION, JSON.stringify(sesion));
  } else {
    SecureStore.deleteItemAsync(CLAVE_SESION).catch(() => undefined);
  }
  fijarToken(sesion?.token ?? null);
  useSesion.setState({ estado: estadoDe(sesion) });
}

// ------------------------------------------------------------------ Acciones

interface RespuestaLogin {
  accessToken?: string;
  userData?: { name?: string; email?: string };
}

export async function iniciarSesion(correo: string, contrasena: string): Promise<void> {
  const usuario = correo.trim().toLowerCase();
  const respuesta = objeto<RespuestaLogin>(
    await postFormulario('login', { email: usuario, password: contrasena, aplicacion: APLICACION }),
  );
  if (!respuesta.accessToken) throw new Error('El servidor no devolvió la sesión.');
  limpiarPlanta();
  guardar({ token: respuesta.accessToken, nombre: respuesta.userData?.name?.trim() ?? '', correo: usuario });
}

export async function plantasDisponibles(): Promise<PlantaDisponible[]> {
  const { data } = await api.get('produccion/establecimiento');
  return leerEstablecimientos(lista(data));
}

interface InfoPlanta {
  co_planta: number;
  nombre_planta?: string;
  rol_usr?: string;
  nombre_usr?: string;
  user_id?: number;
}

const texto = (data: unknown) => (typeof data === 'string' ? data : JSON.stringify(data ?? null));

/**
 * Lo que hacían `ConfigPlanta` y `MainActivity` al entrar a una planta: datos de la planta y del
 * rol, menú, tipos y motivos de guía de remisión, y camaroneras. Si algo falla no se guarda nada.
 */
export async function elegirPlanta(id: number): Promise<void> {
  const actual = leerGuardada();
  if (!actual) throw new Error('No hay sesión.');
  const [info, menu, tipos, motivos, camaroneras] = await Promise.all([
    api.get(`binesMovil/infoPlanta/${id}`).then(r => objeto<InfoPlanta>(r.data)),
    api.get(`binesMovil/menu/${id}`).then(r => lista(r.data)),
    api.get('binesMovil/tipoGuia').then(r => lista(r.data)),
    api.get('binesMovil/motivoGuia').then(r => lista(r.data)),
    api.get('produccion/establecimiento', { params: { es_camaronera: 1 } }).then(r => lista(r.data)),
  ]);
  Storage.setItemSync(CLAVES_PLANTA.menu, texto(menu));
  Storage.setItemSync(CLAVES_PLANTA.tiposGuia, texto(tipos));
  Storage.setItemSync(CLAVES_PLANTA.motivosGuia, texto(motivos));
  Storage.setItemSync(CLAVES_PLANTA.camaroneras, texto(camaroneras));
  usePreferencias.getState().recordarPlanta(id);
  guardar({
    ...actual,
    planta: {
      id: String(info.co_planta ?? id),
      nombre: info.nombre_planta?.trim() ?? '',
      rol: info.rol_usr?.trim() ?? '',
      nombreUsuario: info.nombre_usr?.trim() ?? '',
      idUsuario: String(info.user_id ?? ''),
    },
  });
}

/** Cerrar sesión borra el token y la planta. Lo pendiente de enviar se queda en el equipo. */
export function cerrarSesion(): void {
  limpiarPlanta();
  queryClient.clear();
  guardar(null);
}

function limpiarPlanta(): void {
  Object.values(CLAVES_PLANTA).forEach(clave => Storage.removeItemSync(clave));
}

// ------------------------------------------------------------------ Lecturas

/** La sesión activa, o null. Para los servicios que la necesitan fuera de un componente. */
export function sesionActiva(): Extract<EstadoSesion, { tipo: 'activa' }> | null {
  const estado = useSesion.getState().estado;
  return estado.tipo === 'activa' ? estado : null;
}

export const camaronerasGuardadas = (): Camaronera[] => leerCamaroneras(Storage.getItemSync(CLAVES_PLANTA.camaroneras));

/** Los catálogos de guías de remisión tal como llegaron al elegir la planta, para usarlos sin conexión. */
export const tiposGuiaGuardados = () => Storage.getItemSync(CLAVES_PLANTA.tiposGuia);
export const motivosGuiaGuardados = () => Storage.getItemSync(CLAVES_PLANTA.motivosGuia);

/** Hook: la sesión activa (las pantallas internas solo existen con una). */
export function usePlantaActiva() {
  return useSesion(s => (s.estado.tipo === 'activa' ? s.estado : null));
}
