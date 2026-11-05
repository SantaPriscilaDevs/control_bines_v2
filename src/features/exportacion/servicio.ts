import { api, comprobar, objeto, postFormulario, type RespuestaEstado } from '@/lib/api';
import { limpio } from '@/features/remision/reglas';

export interface Embarque {
  /** Lo que se escribió para buscarlo; el ERP lo vuelve a pedir al guardar. */
  numero: string;
  contenedor: string | null;
  factura: string | null;
  conductor: string | null;
  placa: string | null;
  producto: string | null;
  masters: string | null;
  destino: string | null;
  naviera: string | null;
  sellos: string[];
}

export interface Sellado {
  momento: Date;
  custodia: string;
  placas: string;
  observaciones: string;
}

/** Falla con 400 y el motivo si el embarque ya se registró o no existe este año. */
export async function embarque(numero: string, planta: string): Promise<Embarque> {
  const { data } = await api.get(`binesMovil/infoGuiaExp/${encodeURIComponent(numero.trim())}/${planta}`);
  const datos = objeto<{ embarque?: Record<string, unknown> }>(data).embarque ?? {};
  return {
    numero: numero.trim(),
    contenedor: limpio(datos.co_contenedor),
    factura: limpio(datos.secuencial),
    conductor: limpio(datos.chofer),
    placa: limpio(datos.placa),
    producto: limpio(datos.producto),
    masters: limpio(datos.masters),
    destino: [limpio(datos.ciudad), limpio(datos.pais)].filter(Boolean).join(' - ') || null,
    naviera: limpio(datos.naviera),
    sellos: [datos.sello1, datos.sello2, datos.sello3, datos.sello4].map(limpio).filter((s): s is string => s !== null),
  };
}

const dos = (n: number) => String(n).padStart(2, '0');

/** Lo que manda `RegistroEmbarque`: `hora_sellado` es «fecha hora», sin segundos. */
export function camposSellado(e: Embarque, s: Sellado, planta: string): Record<string, string> {
  const m = s.momento;
  return {
    embarque: e.numero,
    contenedor: e.contenedor ?? '',
    co_planta: planta,
    hora_sellado: `${m.getFullYear()}-${dos(m.getMonth() + 1)}-${dos(m.getDate())} ${dos(m.getHours())}:${dos(m.getMinutes())}`,
    custodia: s.custodia.trim(),
    placas: s.placas.trim(),
    observaciones: s.observaciones.trim(),
    tipo: 'E',
    tipo_guia: 'EX',
  };
}

export async function guardarSellado(e: Embarque, s: Sellado, planta: string): Promise<void> {
  comprobar(objeto<RespuestaEstado>(await postFormulario('binesMovil/saveGuiaEmbarque', camposSellado(e, s, planta))));
}

/** Lo que dice el ERP sobre el embarque, en español formal y con qué hacer. */
export function mensajeEmbarque(numero: string, mensajeServidor: string): string {
  if (/no encontrado/i.test(mensajeServidor)) {
    return `No se encontró el embarque ${numero}. Revise el número: debe ser un embarque de este año en esta planta.`;
  }
  if (/registrado/i.test(mensajeServidor)) return `El embarque ${numero} ya tiene registrada la salida.`;
  return mensajeServidor;
}
