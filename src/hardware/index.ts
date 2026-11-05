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
};

declare class HopelandModule extends NativeModule<EventosHopeland> {
  /** Si la pantalla visible espera el gatillo; si no, la tecla sigue su curso normal. */
  escucharGatillo(activo: boolean): void;
  /** Lee un código de barras o QR. Espera hasta [esperaMs]; null si no leyó nada. */
  leerCodigo(esperaMs: number): Promise<string | null>;
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
    try {
      const texto = (await Hopeland.leerCodigo(3_000))?.trim();
      return texto ? { tipo: 'leido', texto } : { tipo: 'sinLectura' };
    } catch (error) {
      return { tipo: 'noDisponible', motivo: error instanceof Error ? error.message : NO_DISPONIBLE };
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
