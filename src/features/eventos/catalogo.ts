export type Direccion = 'ingreso' | 'salida';
export type Modulo = 'Salidas' | 'Consultas';

/**
 * Un evento de trazabilidad con guía de movilización. [tipoMov], [tipoTra] y [observaciones] son
 * los valores con los que la app vieja arranca cada evento; el backend distingue el paso del
 * monitor por [observaciones], así que deben quedar idénticos.
 */
export interface Evento {
  id: number;
  boton: string;
  tipoMov: 'Ingreso' | 'Egreso';
  tipoTra: string;
  observaciones: string;
}

export interface GrupoEventos {
  titulo: string;
  eventos: Evento[];
}

/** Una opción que no es un evento. [par] agrupa las que van como Salida e Ingreso. */
export interface Opcion {
  id: number;
  modulo: Modulo;
  titulo: string;
  par?: string;
  direccion?: Direccion;
}

/** Los mismos de `$en_camaronera` en `guardarTrazabilidadPreGuia`. */
export const EN_CAMARONERA = new Set(['GCAM', 'GPES', 'CAM', 'PES']);

/** «Dashboard»: lo tienen todos los roles; en esta app es el resumen del Inicio, no una opción. */
export const DASHBOARD = 10304;

/**
 * Opciones del ERP que esta app dejó fuera a propósito (registrar, comprobar y estado del bin,
 * alimentar inventario, despacho, autorizar salidas y guías PDF). Si un rol todavía las recibe,
 * no se muestran.
 */
export const FUERA_DE_ALCANCE = new Set([10306, 10305, 10317, 10323, 10312, 10318, 10319, 10313]);

const ev = (id: number, boton: string, tipoMov: Evento['tipoMov'], tipoTra: string, observaciones: string): Evento => ({
  id,
  boton,
  tipoMov,
  tipoTra,
  observaciones,
});

/** Los ids salen de `ControlBinMovilController::getMenuMovil`. */
export const GRUPOS: GrupoEventos[] = [
  {
    titulo: 'Garita planta',
    eventos: [
      ev(1010, 'Ingreso', 'Ingreso', 'GAR', 'Trazabilidad de Garita Planta'),
      ev(1020, 'Salida', 'Egreso', 'GAR', 'Trazabilidad de Garita Planta'),
    ],
  },
  {
    titulo: 'Llegada a planta',
    eventos: [
      ev(1000, 'Sin pesca', 'Ingreso', 'PLA', 'Llegada a Planta'),
      ev(1005, 'Con pesca', 'Ingreso', 'PLAP', 'Llegada a Planta con Pesca'),
    ],
  },
  {
    titulo: 'Garita camaronera',
    eventos: [
      ev(1030, 'Ingreso', 'Ingreso', 'CAM', 'Trazabilidad de Garita Camaronera'),
      ev(1040, 'Salida', 'Egreso', 'CAM', 'Trazabilidad de Garita Camaronera'),
    ],
  },
  {
    titulo: 'Llegada a camaronera',
    eventos: [
      ev(1025, 'Sin pesca', 'Ingreso', 'GCAM', 'Llegada a Camaronera'),
      ev(1035, 'Con pesca', 'Ingreso', 'GPES', 'Llegada a Garita con Pesca'),
    ],
  },
  {
    titulo: 'Garita interna',
    eventos: [
      ev(1050, 'Ingreso', 'Ingreso', 'HIE', 'Trazabilidad de Planta Hielo'),
      ev(1060, 'Salida', 'Egreso', 'HIE', 'Trazabilidad de Planta Hielo'),
    ],
  },
  {
    titulo: 'Despacho de meta',
    eventos: [
      ev(1061, 'Ingreso', 'Ingreso', 'MET', 'Trazabilidad de Despacho Meta'),
      ev(1062, 'Salida', 'Egreso', 'MET', 'Trazabilidad de Despacho Meta'),
    ],
  },
  {
    titulo: 'Despacho de hielo',
    eventos: [
      ev(1063, 'Ingreso', 'Ingreso', 'DHIE', 'Trazabilidad de Despacho Hielo'),
      ev(1064, 'Salida', 'Egreso', 'DHIE', 'Trazabilidad de Despacho Hielo'),
    ],
  },
  {
    titulo: 'Pesca',
    eventos: [
      ev(1070, 'Inicio', 'Ingreso', 'PES', 'Trazabilidad de Inicio de Pesca'),
      ev(1080, 'Fin', 'Egreso', 'PES', 'Trazabilidad de Fin de Pesca'),
    ],
  },
  {
    titulo: 'Análisis de calidad',
    eventos: [
      ev(1090, 'Ingreso', 'Ingreso', 'CAL', 'Trazabilidad de Analisis Calidad'),
      ev(1100, 'Salida', 'Egreso', 'CAL', 'Trazabilidad de Analisis Calidad'),
    ],
  },
  {
    titulo: 'Recepción de pesca',
    eventos: [ev(1110, 'Ingreso', 'Ingreso', 'REC', 'Ingreso en Recepción de Pesca')],
  },
];

export const ID_SALIDA_REMISION = 10321;
export const ID_INGRESO_REMISION = 10322;
export const ID_EXPORTACION = 10320;
export const ID_VALIDAR_PERSONAL = 10314;
export const ID_GUIAS_VIRTUALES = 10315;

export const OPCIONES: Opcion[] = [
  { id: ID_EXPORTACION, modulo: 'Salidas', titulo: 'Salida de exportación' },
  { id: ID_SALIDA_REMISION, modulo: 'Salidas', titulo: 'Salida', par: 'Guías de remisión', direccion: 'salida' },
  { id: ID_INGRESO_REMISION, modulo: 'Salidas', titulo: 'Ingreso', par: 'Guías de remisión', direccion: 'ingreso' },
  { id: ID_VALIDAR_PERSONAL, modulo: 'Consultas', titulo: 'Validar personal' },
  { id: ID_GUIAS_VIRTUALES, modulo: 'Consultas', titulo: 'Guías virtuales' },
];

const EVENTOS = new Map(GRUPOS.flatMap(g => g.eventos.map(e => [e.id, e] as const)));
const GRUPO_DE = new Map(GRUPOS.flatMap(g => g.eventos.map(e => [e.id, g] as const)));
const OPCION_DE = new Map(OPCIONES.map(o => [o.id, o] as const));

export const evento = (id: number | null | undefined): Evento | undefined => (id == null ? undefined : EVENTOS.get(id));
export const grupoDe = (e: Evento): GrupoEventos => GRUPO_DE.get(e.id)!;
export const opcion = (id: number | null | undefined): Opcion | undefined => (id == null ? undefined : OPCION_DE.get(id));

export const direccionDe = (e: Evento): Direccion => (e.tipoMov === 'Ingreso' ? 'ingreso' : 'salida');

/** I o E, como lo esperan los endpoints. */
export const siglaDe = (e: Evento): 'I' | 'E' => (e.tipoMov === 'Ingreso' ? 'I' : 'E');

/** Se registra en una camaronera: hay que elegirla y el movimiento se numera con su secuencia. */
export const enCamaronera = (e: Evento): boolean => EN_CAMARONERA.has(e.tipoTra);

/** Solo la salida de garita camaronera puede marcar que el camión salió sin pesca. */
export const permiteSinPesca = (e: Evento): boolean => e.tipoTra === 'CAM' && e.tipoMov === 'Egreso';

/** El ERP conoce la opción pero esta app no la ubica en ningún módulo (las fuera de alcance no cuentan). */
export const esDesconocida = (id: number | null): boolean =>
  id !== DASHBOARD && !(id != null && FUERA_DE_ALCANCE.has(id)) && !evento(id) && !opcion(id);

/** «Garita planta · Ingreso». */
export const nombreEvento = (e: Evento): string => `${grupoDe(e).titulo} · ${e.boton}`;
