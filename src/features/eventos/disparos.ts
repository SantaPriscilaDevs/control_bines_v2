import { api, esErrorApi, exito, motivoDe, objeto, postFormulario, type RespuestaEstado } from '@/lib/api';
import { enLineaAhora } from '@/lib/red';
import { avisarCambio, baseDatos } from '@/lib/storage/baseDatos';
import type { Camaronera } from '@/features/sesion/menu';
import { direccionDe, enCamaronera, EN_CAMARONERA, evento as eventoPorId, permiteSinPesca, siglaDe, type Evento } from './catalogo';
import { diaLocal, fechaHoraLocal, motivoRechazo } from './reglas';

export type EstadoDisparo = 'Enviado' | 'Pendiente' | 'Rechazado';

/**
 * Un evento registrado en este equipo: enviado al ERP o esperando conexión. Los campos son los que
 * pide `binesMovil/guardar-trazabilidad-guia`, para poder reenviarlo tal cual.
 */
export interface Disparo {
  id: number;
  guia: string;
  idEvento: number;
  /** I o E. */
  tipo: string;
  tipoTransaccion: string;
  observaciones: string;
  coPlanta: string;
  coCamaronera: number;
  nombreCamaronera: string | null;
  sinPesca: boolean;
  /** Cuándo se registró, en hora local: yyyy-MM-dd HH:mm:ss. */
  fechaHora: string;
  dia: string;
  estado: EstadoDisparo;
  /** Por qué lo rechazó el ERP. */
  mensaje: string | null;
}

/** Lo que se va a registrar. [camaronera] solo en los eventos que pasan en una camaronera. */
export interface NuevoDisparo {
  evento: Evento;
  guia: string;
  coPlanta: string;
  camaronera: Camaronera | null;
  sinPesca: boolean;
}

export type ResultadoRegistro =
  | { tipo: 'registrado' }
  /** El ERP no lo aceptó (duplicado, falta un ingreso previo…). No se guarda. */
  | { tipo: 'rechazado'; motivo: string }
  /** Sin conexión con el ERP: quedó en el equipo y se envía solo. */
  | { tipo: 'guardadoSinConexion' };

/** Datos de una guía de movilización o pre-guía, como los arma `createTrazabilidadGuia`. */
export interface GuiaTrazabilidad {
  guia: string;
  camaronera: string;
  piscina: string;
  empresa: string;
  plantaDestino: string;
  plantaSalida: string;
  conductor: string;
  /** La placa. */
  movil: string;
  gramaje: string;
  /** El ERP todavía no los manda: mientras vengan vacíos, esas filas no se muestran. */
  cedulaConductor: string | null;
  descripcionMovil: string | null;
}

const textoDe = (valor: unknown): string => (valor == null ? '' : String(valor).trim());
const opcional = (valor: unknown): string | null => textoDe(valor) || null;

// ------------------------------------------------------------------ ERP

/** Siguiente número de movimiento de la planta o, si el evento es en camaronera, de la camaronera. */
export async function numeroMovimiento(idPlanta: string): Promise<number> {
  const { data } = await api.get(`binesMovil/infoMov/${idPlanta}`);
  return Number(objeto<{ num_mov?: unknown }>(data).num_mov) || 0;
}

/** Busca la guía o pre-guía. Ojo: una pre-guía queda marcada como LEÍDA con solo consultarla. */
export async function consultarGuia(guia: string, e: Evento, numero: number | null, coPlanta: string): Promise<GuiaTrazabilidad> {
  const datos = objeto<Record<string, unknown>>(
    await postFormulario('binesMovil/registrar-trazabilidad', {
      guia: guia.trim(),
      numero_movimiento: String(numero ?? 0),
      movimiento: siglaDe(e),
      establecimiento: coPlanta,
    }),
  );
  return {
    guia: textoDe(datos.guia) || guia,
    camaronera: textoDe(datos.camaronera),
    piscina: textoDe(datos.piscina),
    empresa: textoDe(datos.empresa),
    plantaDestino: textoDe(datos.planta_destino),
    plantaSalida: textoDe(datos.planta_salida),
    conductor: textoDe(datos.conductor),
    movil: textoDe(datos.movil),
    gramaje: textoDe(datos.gramaje),
    cedulaConductor: opcional(datos.cedula_conductor),
    descripcionMovil: opcional(datos.descripcion_movil),
  };
}

/** Planta cuya secuencia numera el movimiento (`guardarTrazabilidadPreGuia` usa la misma regla). */
export function idPlantaDe(d: Pick<Disparo, 'tipoTransaccion' | 'coCamaronera' | 'coPlanta'>): string {
  return EN_CAMARONERA.has(d.tipoTransaccion) && d.coCamaronera !== 0 ? String(d.coCamaronera) : d.coPlanta;
}

/** Los parámetros de `guardar-trazabilidad-guia`, con los mismos valores fijos que la app vieja. */
export function camposRegistro(d: Omit<Disparo, 'id'>, numero: number): Record<string, string> {
  return {
    guia: d.guia.trim().toUpperCase(),
    numMov: String(numero),
    tipo: d.tipo,
    co_planta: d.coPlanta,
    tipo_transaccion: d.tipoTransaccion,
    co_camaronera: String(d.coCamaronera),
    observaciones: d.observaciones,
    id_clase_mov: '1',
    externo: '1',
    tot_man: '0',
    tipo_guia: 'P',
    tags_validos: '[]',
    sin_pesca: d.sinPesca ? '1' : '0',
  };
}

export function aDisparo(nuevo: NuevoDisparo, momento: Date, estado: EstadoDisparo): Omit<Disparo, 'id'> {
  const enCam = enCamaronera(nuevo.evento);
  return {
    guia: nuevo.guia.trim().toUpperCase(),
    idEvento: nuevo.evento.id,
    tipo: siglaDe(nuevo.evento),
    tipoTransaccion: nuevo.evento.tipoTra,
    observaciones: nuevo.evento.observaciones,
    coPlanta: nuevo.coPlanta,
    coCamaronera: enCam ? (nuevo.camaronera?.id ?? 0) : 0,
    nombreCamaronera: enCam ? (nuevo.camaronera?.nombre ?? null) : null,
    sinPesca: permiteSinPesca(nuevo.evento) && nuevo.sinPesca,
    fechaHora: fechaHoraLocal(momento),
    dia: diaLocal(momento),
    estado,
    mensaje: null,
  };
}

/**
 * Con conexión lo manda al ERP; sin conexión (o si el ERP no responde) lo deja pendiente.
 * [numero] es el que muestra la pantalla; si falta, se pide.
 */
export async function registrar(nuevo: NuevoDisparo, numero: number | null): Promise<ResultadoRegistro> {
  const disparo = aDisparo(nuevo, new Date(), 'Pendiente');
  const quedaPendiente = async (): Promise<ResultadoRegistro> => {
    await insertar(disparo);
    return { tipo: 'guardadoSinConexion' };
  };
  if (!enLineaAhora()) return quedaPendiente();
  try {
    const numeroFinal = numero ?? (await numeroMovimiento(idPlantaDe(disparo)));
    const respuesta = objeto<RespuestaEstado>(
      await postFormulario('binesMovil/guardar-trazabilidad-guia', camposRegistro(disparo, numeroFinal)),
    );
    if (!exito(respuesta)) {
      return { tipo: 'rechazado', motivo: motivoRechazo(motivoDe(respuesta), direccionDe(nuevo.evento)) };
    }
    await insertar({ ...disparo, estado: 'Enviado' });
    return { tipo: 'registrado' };
  } catch (error) {
    if (sinConexion(error)) return quedaPendiente();
    return { tipo: 'rechazado', motivo: esErrorApi(error) ? error.message : 'No se pudo registrar. Comuníquese con Sistemas.' };
  }
}

const sinConexion = (error: unknown) => esErrorApi(error) && error.tipo === 'sinConexion';

let envioEnCurso: Promise<number> | null = null;

/**
 * Manda los pendientes de a uno, con la fecha y hora en que se registraron. Así se sabe cuáles
 * aceptó el ERP (el envío masivo de la app vieja respondía «guardado» aunque fallaran) y cada uno
 * se numera con la secuencia que le corresponde. Se detiene al primer problema de conexión.
 */
export function enviarPendientes(): Promise<number> {
  envioEnCurso ??= enviar().finally(() => {
    envioEnCurso = null;
  });
  return envioEnCurso;
}

async function enviar(): Promise<number> {
  let enviados = 0;
  // De a uno y en orden: cada uno pide su número de movimiento justo antes de enviarse.
  for (const pendiente of await pendientes()) {
    const resultado = await enviarUno(pendiente);
    if (resultado === 'sinConexion') break;
    if (resultado === 'enviado') enviados++;
  }
  return enviados;
}

async function enviarUno(pendiente: Disparo): Promise<'enviado' | 'rechazado' | 'sinConexion'> {
  let numero: number;
  try {
    numero = await numeroMovimiento(idPlantaDe(pendiente));
  } catch {
    // Sin número no se envía nada más: se reintenta en el próximo envío.
    return 'sinConexion';
  }
  try {
    const campos = { ...camposRegistro(pendiente, numero), fechaCreacion: pendiente.fechaHora, offline: '1' };
    const respuesta = objeto<RespuestaEstado>(await postFormulario('binesMovil/guardar-trazabilidad-guia', campos));
    if (exito(respuesta)) {
      await actualizar(pendiente.id, 'Enviado', null);
      return 'enviado';
    }
    const ev = eventoPorId(pendiente.idEvento);
    await actualizar(pendiente.id, 'Rechazado', motivoRechazo(motivoDe(respuesta), ev ? direccionDe(ev) : undefined));
    return 'rechazado';
  } catch (error) {
    if (sinConexion(error)) return 'sinConexion';
    await actualizar(pendiente.id, 'Rechazado', esErrorApi(error) ? error.message : null);
    return 'rechazado';
  }
}

// ------------------------------------------------------------------ Base local

interface Fila {
  id: number;
  guia: string;
  id_evento: number;
  tipo: string;
  tipo_transaccion: string;
  observaciones: string;
  co_planta: string;
  co_camaronera: number;
  nombre_camaronera: string | null;
  sin_pesca: number;
  fecha_hora: string;
  dia: string;
  estado: EstadoDisparo;
  mensaje: string | null;
}

const deFila = (f: Fila): Disparo => ({
  id: f.id,
  guia: f.guia,
  idEvento: f.id_evento,
  tipo: f.tipo,
  tipoTransaccion: f.tipo_transaccion,
  observaciones: f.observaciones,
  coPlanta: f.co_planta,
  coCamaronera: f.co_camaronera,
  nombreCamaronera: f.nombre_camaronera,
  sinPesca: f.sin_pesca === 1,
  fechaHora: f.fecha_hora,
  dia: f.dia,
  estado: f.estado,
  mensaje: f.mensaje,
});

async function insertar(d: Omit<Disparo, 'id'>): Promise<void> {
  await baseDatos().runAsync(
    `INSERT INTO disparos (guia, id_evento, tipo, tipo_transaccion, observaciones, co_planta, co_camaronera,
       nombre_camaronera, sin_pesca, fecha_hora, dia, estado, mensaje)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    d.guia,
    d.idEvento,
    d.tipo,
    d.tipoTransaccion,
    d.observaciones,
    d.coPlanta,
    d.coCamaronera,
    d.nombreCamaronera,
    d.sinPesca ? 1 : 0,
    d.fechaHora,
    d.dia,
    d.estado,
    d.mensaje,
  );
  avisarCambio();
}

async function actualizar(id: number, estado: EstadoDisparo, mensaje: string | null): Promise<void> {
  await baseDatos().runAsync('UPDATE disparos SET estado = ?, mensaje = ? WHERE id = ?', estado, mensaje, id);
  avisarCambio();
}

async function pendientes(): Promise<Disparo[]> {
  const filas = await baseDatos().getAllAsync<Fila>("SELECT * FROM disparos WHERE estado = 'Pendiente' ORDER BY id");
  return filas.map(deFila);
}

/** Lo registrado en este equipo en [dia], lo más nuevo primero. */
export async function delDia(dia: string = diaLocal()): Promise<Disparo[]> {
  const filas = await baseDatos().getAllAsync<Fila>('SELECT * FROM disparos WHERE dia = ? ORDER BY id DESC', dia);
  return filas.map(deFila);
}

export async function contarPendientes(): Promise<number> {
  const fila = await baseDatos().getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM disparos WHERE estado = 'Pendiente'");
  return fila?.n ?? 0;
}

/** Lo enviado o rechazado se guarda una semana; lo pendiente nunca se borra. */
export async function borrarAnteriores(dias = 7): Promise<void> {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  await baseDatos().runAsync("DELETE FROM disparos WHERE dia < ? AND estado != 'Pendiente'", diaLocal(desde));
  avisarCambio();
}
