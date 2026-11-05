import { api, comprobar, ErrorApi, esErrorApi, lista, objeto, postFormulario, type RespuestaEstado } from '@/lib/api';
import { avisarCambio, baseDatos } from '@/lib/storage/baseDatos';
import { motivosGuiaGuardados, tiposGuiaGuardados } from '@/features/sesion/sesion';
import type { Planta } from '@/features/sesion/menu';
import { diaLocal, fechaHoraLocal } from '@/features/eventos/reglas';
import {
  camposMovimiento,
  esDevolucion,
  formatoTags,
  guardado,
  guiasVisibles,
  leerCatalogo,
  leerValidacion,
  SIGLA_REMISION,
  type CatalogosRemision,
  type GuiaRemision,
  type MotivoGuia,
  type MovimientoGuia,
  type TipoGuia,
  type ValidacionInventario,
} from './reglas';

/** Del ERP; si no responde, los que se guardaron al elegir la planta (como la app vieja). */
export async function catalogos(): Promise<CatalogosRemision> {
  try {
    const [tipos, motivos] = await Promise.all([
      api.get('binesMovil/tipoGuia').then(r => leerCatalogo(lista(r.data), 'co_tipo_g')),
      api.get('binesMovil/motivoGuia').then(r => leerCatalogo(lista(r.data), 'co_motivo')),
    ]);
    return { tipos, motivos };
  } catch (error) {
    const parsear = (texto: string | null) => {
      try {
        return texto ? JSON.parse(texto) : null;
      } catch {
        return null;
      }
    };
    const tipos = leerCatalogo(parsear(tiposGuiaGuardados()), 'co_tipo_g');
    const motivos = leerCatalogo(parsear(motivosGuiaGuardados()), 'co_motivo');
    if (tipos.length === 0 || motivos.length === 0) throw error;
    return { tipos, motivos };
  }
}

/** Guías emitidas en [fecha] (yyyy-MM-dd). */
export async function guias(fecha: string, planta: string, tipo: TipoGuia, motivo: MotivoGuia, ingreso: boolean): Promise<GuiaRemision[]> {
  const datos = await postFormulario('binesMovil/getGuiasRemision', {
    fecha,
    planta,
    tipo: String(tipo.codigo),
    tipo_mov: ingreso ? 'I' : 'E',
    motivo: String(motivo.codigo),
    sigla: esDevolucion(motivo) ? 'DB' : SIGLA_REMISION,
  });
  return guiasVisibles(lista(datos));
}

/** Registra una devolución (motivo 7) sin leer bines. */
export async function guardarDevolucion(guia: GuiaRemision, ingreso: boolean, observaciones: string, planta: string): Promise<void> {
  comprobar(
    objeto<RespuestaEstado>(
      await postFormulario('binesMovil/saveGuiaRemision', {
        co_planta: planta,
        tipo: ingreso ? 'I' : 'E',
        guia: guia.numero,
        observaciones: observaciones.trim(),
        tipo_guia: 'DB',
      }),
    ),
  );
}

export async function validarInventario(tags: string[], ingreso: boolean, planta: string): Promise<ValidacionInventario> {
  const datos = await postFormulario('binesMovil/validarTagsInventario', {
    tags: formatoTags(tags),
    tipo_mov: ingreso ? 'I' : 'E',
    co_planta: planta,
  });
  return leerValidacion(objeto(datos));
}

/**
 * Registra los bines leídos ([leidos], validados en [validacion]; null si no se leyó ninguno). El
 * número de movimiento y la clase se piden al guardar, no al abrir la pantalla, para no repetir el
 * número de otro equipo.
 */
export async function guardar(movimiento: MovimientoGuia, validacion: ValidacionInventario | null, leidos: string[], planta: string): Promise<void> {
  const { data: numero } = await api.get(`binesMovil/numMov/${planta}`);
  const ultMov = (numero as { ultMov?: unknown } | null)?.ultMov;
  if (ultMov == null || ultMov === '') throw ErrorApi.http(500, 'No se recibió el número de movimiento.');
  const { data: clase } = await api.get(`binesMovil/claseMovGuia/${SIGLA_REMISION}`);
  const idClase = Number((clase as { clase_mov?: unknown } | null)?.clase_mov) || 0;
  const respuesta = objeto<RespuestaEstado>(
    await postFormulario('binesMovil/guardarConfig', camposMovimiento(movimiento, validacion, leidos, String(ultMov), idClase, planta)),
  );
  if (!guardado(respuesta)) comprobar(respuesta);
  // Como la app vieja: al ingresar, la guía queda en la división de esta planta. Si falla, el
  // movimiento ya está guardado y no se informa como error.
  if (movimiento.ingreso) {
    await postFormulario('binesMovil/updateDivision', { co_planta: planta, guia: movimiento.guia, tipo_guia: SIGLA_REMISION }).catch(
      () => undefined,
    );
  }
}

// ------------------------------------------------------------------ Sin conexión

/** Guía escrita a mano cuando no hay conexión: lo leído se guarda en el equipo y se envía después. */
export interface GuiaSinConexion {
  serie: string;
  guia: string;
  devolucion: boolean;
}

export async function guardarSinConexion(guia: GuiaSinConexion, movimiento: MovimientoGuia, leidos: string[], planta: Planta): Promise<void> {
  await baseDatos().runAsync(
    `INSERT INTO movimientos_guia (guia, serie, tipo, tipo_guia, co_planta, id_usuario, nombre_usuario, fecha_hora,
       total_manual, observaciones, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    guia.guia.trim(),
    guia.serie.trim(),
    movimiento.ingreso ? 'I' : 'E',
    guia.devolucion ? 'DB' : SIGLA_REMISION,
    planta.id,
    planta.idUsuario,
    planta.nombreUsuario,
    fechaHoraLocal(),
    movimiento.totalManual,
    movimiento.observaciones.trim(),
    leidos.join(','),
  );
  avisarCambio();
}

export async function cantidadPendientes(): Promise<number> {
  const fila = await baseDatos().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM movimientos_guia');
  return fila?.n ?? 0;
}

interface FilaMovimiento {
  id: number;
  guia: string;
  tipo: string;
  co_planta: string;
  id_usuario: string;
  nombre_usuario: string;
  fecha_hora: string;
  total_manual: number;
  observaciones: string;
  tags: string;
}

let envioEnCurso: Promise<number> | null = null;

/**
 * Envía las guías guardadas sin conexión. A diferencia de `SincroGuiaRemision`, borra cada una
 * solo si el ERP respondió y no pidió conservarla, y sigue con las demás. Se detiene sin conexión.
 */
export function enviarPendientes(): Promise<number> {
  envioEnCurso ??= enviar().finally(() => {
    envioEnCurso = null;
  });
  return envioEnCurso;
}

async function enviar(): Promise<number> {
  const filas = await baseDatos().getAllAsync<FilaMovimiento>('SELECT * FROM movimientos_guia ORDER BY id');
  let enviados = 0;
  for (const fila of filas) {
    try {
      // Como `SincroGuiaRemision`: siempre con `tipo_guia` EP y sin el total leído.
      const { data } = await api.post('binesMovil/offline/movimiento_bin', {
        tipo_mov: fila.tipo,
        nu_guia: fila.guia,
        co_planta: Number(fila.co_planta) || 0,
        creador: fila.id_usuario,
        nom_creador: fila.nombre_usuario,
        fecha_crea: fila.fecha_hora,
        total_scan: 0,
        scan_manual: fila.total_manual,
        observaciones: fila.observaciones,
        tags: fila.tags.split(',').filter(t => t.trim()),
        tipo_guia: SIGLA_REMISION,
      });
      if ((data as { safe_proceed?: boolean } | null)?.safe_proceed !== false) {
        await baseDatos().runAsync('DELETE FROM movimientos_guia WHERE id = ?', fila.id);
        avisarCambio();
        enviados++;
      }
    } catch (error) {
      if (esErrorApi(error) && error.tipo === 'sinConexion') break;
    }
  }
  return enviados;
}

export const hoy = () => diaLocal();
