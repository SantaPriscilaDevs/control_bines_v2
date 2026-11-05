import { PermissionsAndroid } from 'react-native';
import { NativeModule, requireOptionalNativeModule } from 'expo';

/**
 * Lector de códigos, gatillo y RFID de los handhelds Hopeland, desde JavaScript.
 *
 * El trabajo lo hace el módulo nativo `Hopeland` (`modules/hopeland`, Kotlin), que envuelve los
 * SDK de Hopeland. Mientras no esté en la compilación (o el equipo no sea un Hopeland), todo
 * responde «no disponible» y las pantallas ofrecen escribir el dato a mano.
 */
type EventosHopeland = {
  /** El gatillo o un botón lateral de lectura. Solo llega mientras alguien escucha. */
  onGatillo: (evento: { presionado: boolean }) => void;
  /** Un tag leído durante la lectura continua, repetidos incluidos. */
  onTag: (evento: { epc: string; rssi: number }) => void;
  /**
   * Un código leído por el servicio de escaneo del sistema (HY416), que atiende el gatillo por su
   * cuenta. Solo llega mientras alguien escucha el gatillo.
   */
  onCodigo: (evento: { texto: string }) => void;
};

declare class HopelandModule extends NativeModule<EventosHopeland> {
  /** Si la pantalla visible espera el gatillo; si no, la tecla sigue su curso normal. */
  escucharGatillo(activo: boolean): void;
  /**
   * Lee un código de barras o QR (espera unos 3 s). `texto` vacío si no leyó nada; `motivo` si el
   * lector no se pudo usar. Pita al leer.
   */
  leerCodigo(esperaMs: number): Promise<{ texto?: string; motivo?: string }>;
  /** Suelta el lector de códigos para que otra app lo pueda abrir. */
  liberarCodigos(): void;
  /** Abre el lector RFID. null si quedó listo; si no, el motivo. */
  abrirRfid(potencia: number, modo: number[]): Promise<string | null>;
  iniciarLecturaRfid(): void;
  detenerLecturaRfid(): void;
  cerrarRfid(): void;
  /** El pitido corto de lectura correcta. */
  pitar(): void;
}

const Hopeland = requireOptionalNativeModule<HopelandModule>('Hopeland');

const NO_DISPONIBLE = 'El lector de este equipo todavía no está disponible en esta versión.';

/** El SDK del lector de códigos no abre sin el permiso «Teléfono». Se pide la primera vez. */
async function permisoTelefono(): Promise<boolean> {
  const permiso = PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE;
  if (await PermissionsAndroid.check(permiso)) return true;
  return (await PermissionsAndroid.request(permiso)) === PermissionsAndroid.RESULTS.GRANTED;
}

/** Escuchar el gatillo: lo usa `useGatillo`. Devuelve cómo dejar de escuchar. */
export function escucharGatillo(alPresionar: () => void, alSoltar: () => void): () => void {
  if (!Hopeland) return () => undefined;
  Hopeland.escucharGatillo(true);
  const suscripcion = Hopeland.addListener('onGatillo', evento => (evento.presionado ? alPresionar() : alSoltar()));
  return () => {
    suscripcion.remove();
    Hopeland.escucharGatillo(false);
  };
}

/** Códigos que lee el servicio de escaneo del sistema (HY416). Devuelve cómo dejar de escuchar. */
export function escucharCodigos(alLeer: (texto: string) => void): () => void {
  if (!Hopeland) return () => undefined;
  const suscripcion = Hopeland.addListener('onCodigo', evento => {
    const texto = evento.texto.trim();
    if (texto) alLeer(texto);
  });
  return () => suscripcion.remove();
}

export type ResultadoLectura =
  /** Texto leído, sin espacios ni saltos de línea en los extremos. */
  | { tipo: 'leido'; texto: string }
  /** Pasó el tiempo de lectura sin encontrar un código. */
  | { tipo: 'sinLectura' }
  /** El lector no se puede usar: no es un handheld o no abrió. */
  | { tipo: 'noDisponible'; motivo: string };

/** Lector de códigos de barras y QR. */
export const lectorCodigos = {
  async leer(): Promise<ResultadoLectura> {
    if (!Hopeland) return { tipo: 'noDisponible', motivo: NO_DISPONIBLE };
    if (!(await permisoTelefono())) {
      return { tipo: 'noDisponible', motivo: 'Falta el permiso de «Teléfono» para usar el lector. Actívelo en los ajustes de la app.' };
    }
    try {
      const resultado = await Hopeland.leerCodigo(3_000);
      if (resultado.motivo) return { tipo: 'noDisponible', motivo: resultado.motivo };
      const texto = resultado.texto?.trim();
      return texto ? { tipo: 'leido', texto } : { tipo: 'sinLectura' };
    } catch {
      return { tipo: 'noDisponible', motivo: 'El lector dejó de responder. Intente nuevamente.' };
    }
  },
  liberar(): void {
    Hopeland?.liberarCodigos();
  },
};

/**
 * Potencia (dBm) y modo de lectura (`modo|Q|sesión|búsqueda`), como los manda el ERP en cada
 * opción del menú (`uhf_power`, `uhf_mode`).
 */
export interface ConfiguracionRfid {
  potencia: number;
  modo: number[];
}

/** Lectura de muchos bines a la vez (guías de remisión). */
export const RFID_CONTINUA: ConfiguracionRfid = { potencia: 33, modo: [255, 4, 0, 0] };

/** Toma lo que manda el ERP («255|4|0|0» o «255,4,0,0»); si falta o no se entiende, [porDefecto]. */
export function configuracionRfid(potencia: unknown, modo: unknown, porDefecto: ConfiguracionRfid): ConfiguracionRfid {
  const partes =
    typeof modo === 'string'
      ? modo
          .split(/[|,]/)
          .map(p => Number.parseInt(p.trim(), 10))
          .filter(n => !Number.isNaN(n))
      : [];
  const dbm = Number(potencia);
  return {
    potencia: Number.isInteger(dbm) && dbm > 0 ? dbm : porDefecto.potencia,
    modo: partes.length === 4 ? partes : porDefecto.modo,
  };
}

export type AperturaRfid = { lista: true } | { lista: false; motivo: string };

/** Lector UHF. Una pantalla lo abre al entrar y lo cierra al salir. */
export const lectorRfid = {
  async abrir(configuracion: ConfiguracionRfid): Promise<AperturaRfid> {
    if (!Hopeland) return { lista: false, motivo: NO_DISPONIBLE };
    try {
      const motivo = await Hopeland.abrirRfid(configuracion.potencia, configuracion.modo);
      return motivo ? { lista: false, motivo } : { lista: true };
    } catch (error) {
      return { lista: false, motivo: error instanceof Error ? error.message : NO_DISPONIBLE };
    }
  },
  /** Lee sin parar hasta llamar a la función que devuelve (gatillo apretado). */
  leer(alLeer: (epc: string) => void): () => void {
    if (!Hopeland) return () => undefined;
    const suscripcion = Hopeland.addListener('onTag', tag => alLeer(tag.epc.toUpperCase()));
    Hopeland.iniciarLecturaRfid();
    return () => {
      Hopeland.detenerLecturaRfid();
      suscripcion.remove();
    };
  },
  cerrar(): void {
    Hopeland?.cerrarRfid();
  },
};

export const pitar = (): void => Hopeland?.pitar();
