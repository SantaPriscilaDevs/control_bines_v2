export interface TipoGuia {
  codigo: number;
  nombre: string;
}

export interface MotivoGuia {
  codigo: number;
  nombre: string;
}

/** Una devolución se registra sin leer bines. */
export const MOTIVO_DEVOLUCION = 7;
export const esDevolucion = (motivo: MotivoGuia | null | undefined) => motivo?.codigo === MOTIVO_DEVOLUCION;

/** Sigla de la clase de movimiento y del `tipo_guia` de las guías de remisión. */
export const SIGLA_REMISION = 'EP';

export interface CatalogosRemision {
  tipos: TipoGuia[];
  motivos: MotivoGuia[];
}

/** Los que elegía la app vieja al abrir: el segundo tipo y el primer motivo. */
export const tipoInicial = (c: CatalogosRemision): TipoGuia | null => c.tipos[1] ?? c.tipos[0] ?? null;
export const motivoInicial = (c: CatalogosRemision): MotivoGuia | null => c.motivos[0] ?? null;

export interface LineaGuia {
  descripcion: string;
  cantidad: string | null;
  unidad: string | null;
}

export interface GuiaRemision {
  serie: string;
  numero: string;
  motivo: number | null;
  tipo: number | null;
  partida: string | null;
  llegada: string | null;
  destinatario: string | null;
  transporte: string | null;
  conductor: string | null;
  placa: string | null;
  observacion: string | null;
  /** Ya tiene un movimiento de bines registrado en esta dirección. */
  registrada: boolean;
  detalle: LineaGuia[];
  /** Bines que lleva la guía según su detalle: es el máximo que se puede leer. */
  bines: number;
}

/** Texto limpio, o null si viene vacío o como «null». */
export function limpio(valor: unknown): string | null {
  if (valor == null) return null;
  const texto = String(valor).trim();
  return texto && texto !== 'null' ? texto : null;
}

const entero = (valor: unknown): number | null => {
  const numero = Number(valor);
  return valor != null && valor !== '' && Number.isInteger(numero) ? numero : null;
};

/** Tipos y motivos tal como llegan (`co_tipo_g` / `co_motivo` y `descripcion`). */
export function leerCatalogo(datos: unknown, clave: 'co_tipo_g' | 'co_motivo'): { codigo: number; nombre: string }[] {
  if (!Array.isArray(datos)) return [];
  return datos.flatMap(elemento => {
    const objeto = (elemento ?? {}) as Record<string, unknown>;
    const codigo = entero(objeto[clave]);
    return codigo === null ? [] : [{ codigo, nombre: limpio(objeto.descripcion) ?? '' }];
  });
}

/**
 * Las reglas de `MovimientosTraslados.goToScanBines`: según la serie se cuentan solo las líneas de
 * bines o todas. La cantidad se trunca («24.00» → 24).
 */
export function binesDe(serie: string, motivo: number | null, tipo: number | null, detalle: LineaGuia[]): number {
  const cantidad = (linea: LineaGuia) => {
    const n = Number.parseInt((linea.cantidad ?? '').split('.')[0].trim(), 10);
    return Number.isNaN(n) ? 0 : n;
  };
  const todas = detalle.reduce((suma, l) => suma + cantidad(l), 0);
  const deBines = detalle.filter(l => l.descripcion.includes('BIN')).reduce((suma, l) => suma + cantidad(l), 0);
  if (serie === '001007') {
    const par = `${motivo}-${tipo}`;
    if (par === '5-5' || par === '1-1' || par === '5-9') return deBines;
    if (par === '5-3') return todas;
    return 0;
  }
  if (serie === '024006' || serie === '024010') return todas;
  return deBines;
}

/** Guías de `getGuiasRemision`. Se ocultan las que no tienen detalle y las que tienen otro movimiento. */
export function guiasVisibles(datos: unknown): GuiaRemision[] {
  if (!Array.isArray(datos)) return [];
  const vistas = new Set<string>();
  return datos.flatMap(elemento => {
    const g = (elemento ?? {}) as Record<string, unknown>;
    const detalleCrudo = Array.isArray(g.detalle_guia_remision) ? (g.detalle_guia_remision as Record<string, unknown>[]) : [];
    const activo = limpio(g.activo);
    if (detalleCrudo.length === 0 || (activo !== null && activo !== '1')) return [];
    const serie = limpio(g.numeroserie) ?? '';
    const numero = limpio(g.guia_remision) ?? '';
    const clave = `${serie}|${numero}`;
    if (vistas.has(clave)) return [];
    vistas.add(clave);
    const detalle = detalleCrudo.map(l => ({
      descripcion: limpio(l.descripcion) ?? '',
      cantidad: limpio(l.cantidad),
      unidad: limpio(l.unidad),
    }));
    const motivo = entero(g.co_motivo);
    const tipo = entero(g.co_tipo_g);
    return [
      {
        serie,
        numero,
        motivo,
        tipo,
        partida: limpio(g.PuntoPartida),
        llegada: limpio(g.PuntoLlegada),
        destinatario: limpio(g.Destinatario),
        transporte: limpio(g.Transporte),
        conductor: limpio(g.Chofer),
        placa: limpio(g.placa),
        observacion: limpio(g.observacion),
        registrada: activo === '1',
        detalle,
        bines: binesDe(serie, motivo, tipo, detalle),
      },
    ];
  });
}

/** «001-007-000123»: serie y número de una guía de remisión como se imprimen. */
export function numeroRemision(serie: string, numero: string): string {
  const partes = serie.match(/.{1,3}/g)?.filter(p => p.trim()) ?? [];
  return [...partes, numero].join('-');
}

// ------------------------------------------------------------------ Validación de bines

/** Resultado de la validación de un tag. Inválido es «stock inválido» en el inventario. */
export type ResultadoTag = 'registrado' | 'noRegistrado' | 'invalido';

export interface TagRevisado {
  tag: string;
  resultado: ResultadoTag;
  descripcion: string | null;
}

/** [tagsOk] se reenvía tal cual al guardar el movimiento. */
export interface ValidacionInventario {
  tags: TagRevisado[];
  tagsOk: unknown[];
}

/** `[E2…, E2…]`: el `toString()` de la lista que mandaba la app vieja; el ERP lo separa por comas. */
export const formatoTags = (tags: string[]) => `[${tags.join(', ')}]`;

export function leerValidacion(datos: unknown): ValidacionInventario {
  const objeto = (datos ?? {}) as Record<string, unknown>;
  const respuesta = Array.isArray(objeto.tags_response) ? (objeto.tags_response as Record<string, unknown>[]) : [];
  return {
    tagsOk: Array.isArray(objeto.tags_OK) ? objeto.tags_OK : [],
    tags: respuesta.map(t => ({
      tag: limpio(t.codigo_tag) ?? '',
      resultado: t.status_save === 'OK' ? 'registrado' : t.status_save === 'NR' ? 'noRegistrado' : 'invalido',
      descripcion: limpio(t.descripcion),
    })),
  };
}

export interface MovimientoGuia {
  guia: string;
  ingreso: boolean;
  totalManual: number;
  observaciones: string;
}

/**
 * Los campos de `guardarConfig`. `tags_validos` como lo arma `ScanBines`: los objetos de `tags_OK`
 * de los bines que siguen en la lista, y los no registrados o inválidos con su código, que el ERP
 * solo anota en su registro.
 */
export function camposMovimiento(
  movimiento: MovimientoGuia,
  validacion: ValidacionInventario | null,
  leidos: string[],
  numeroMovimiento: string,
  idClase: number,
  planta: string,
): Record<string, string> {
  const enLista = new Set(leidos.map(t => t.toUpperCase()));
  const codigoDe = (elemento: unknown) => {
    const codigo = (elemento as Record<string, unknown> | null)?.codigo_tag;
    return typeof codigo === 'string' ? codigo.toUpperCase() : '';
  };
  const validos = (validacion?.tagsOk ?? []).filter(e => enLista.has(codigoDe(e)));
  const otros = (validacion?.tags ?? [])
    .filter(t => t.resultado !== 'registrado' && enLista.has(t.tag.toUpperCase()))
    .map(t => ({ status_save: t.resultado === 'noRegistrado' ? 'NR' : 'SS', codigo_tag: t.tag }));
  return {
    co_planta: planta,
    tipo: movimiento.ingreso ? 'I' : 'E',
    numMov: numeroMovimiento,
    guia: movimiento.guia,
    tipo_guia: SIGLA_REMISION,
    id_clase_mov: String(idClase),
    tot_man: String(movimiento.totalManual),
    sellos: 'null',
    observaciones: movimiento.observaciones.trim(),
    tags_validos: JSON.stringify([...validos, ...otros]),
  };
}

/**
 * `guardarMovTransaction` confirma el movimiento y después intenta actualizar el plan de pesca
 * buscando la guía en `a25100`. Una guía de remisión no está ahí, así que responde `status` 404
 * «Error al actualizar estado!!!» con el movimiento ya guardado. Eso cuenta como guardado.
 */
export function guardado(respuesta: { status?: unknown; msg?: unknown }): boolean {
  const status = Number(respuesta?.status);
  return status === 200 || (status === 404 && /actualizar estado/i.test(String(respuesta?.msg ?? '')));
}

/** «…4A0C 01A3»: los últimos 8 caracteres del EPC, que es lo que se compara a ojo. */
export function tagCorto(epc: string): string {
  if (epc.length <= 8) return epc;
  const fin = epc.slice(-8);
  return `…${fin.slice(0, 4)} ${fin.slice(4)}`;
}
