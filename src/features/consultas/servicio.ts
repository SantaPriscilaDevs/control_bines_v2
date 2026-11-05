import { api, objeto, postFormulario } from '@/lib/api';
import { limpio } from '@/features/remision/reglas';

export interface RevisionPermiso {
  usuario: string | null;
  hora: string | null;
  aprobado: boolean;
  autorizado: string | null;
}

export interface Persona {
  cedula: string;
  nombre: string;
  cargo: string | null;
  seccion: string | null;
  activo: boolean;
  /** La frase del ERP sobre el estado. */
  estado: string;
  /** La frase del ERP sobre el celular, y si lo puede ingresar. */
  celular: string | null;
  puedeIngresarCelular: boolean;
  permiso: RevisionPermiso[];
}

export interface GuiaVirtual {
  codigo: string;
  origen: string | null;
  destino: string | null;
  empresa: string | null;
  plataforma: string | null;
  placa: string | null;
  estado: string | null;
}

/** El ERP pinta de verde la frase del celular cuando puede ingresarlo. No es un color de la app. */
// eslint-disable-next-line no-restricted-syntax -- es el valor que manda el ERP, solo se compara.
const VERDE = '#4caf50';

/** Falla con el `message` del ERP (400) si la cédula no está registrada. */
export async function persona(cedula: string): Promise<Persona> {
  const { data } = await api.get('binesMovil/validarPersonal', { params: { cedula: cedula.trim() } });
  const d = objeto<Record<string, unknown>>(data);
  const permisos = Array.isArray(d.permiso) ? (d.permiso as Record<string, unknown>[]) : [];
  return {
    cedula: limpio(d.cedula) ?? cedula.trim(),
    nombre: limpio(d.nombre) ?? '',
    cargo: limpio(d.cargo),
    seccion: limpio(d.seccion),
    activo: d.estado_value === 'success',
    estado: limpio(d.estado) ?? '',
    celular: limpio(d.celular),
    puedeIngresarCelular: String(d.color ?? '').toLowerCase() === VERDE,
    permiso: permisos.map(p => ({
      usuario: limpio(p.usuario),
      hora: limpio(p.fecha_revision),
      aprobado: p.aprobado === '1' || p.aprobado === 'true' || p.aprobado === 1 || p.aprobado === true,
      autorizado: limpio(p.autorizar),
    })),
  };
}

/** Ruta de la foto del colaborador; responde 400 si no tiene. */
export const rutaFoto = (cedula: string) => `binesMovil/getFotoPersonal?cedula=${encodeURIComponent(cedula)}`;

/** Registra la lectura de la guía en la planta y devuelve sus datos; null si no existe. */
export async function recibirGuiaVirtual(codigo: string, planta: string): Promise<GuiaVirtual | null> {
  const datos = objeto<{ guia?: Record<string, unknown>[] }>(
    await postFormulario('binesMovil/obtenerGuiaLog', { co_guiavirtual: codigo, co_planta: planta, etiqueta: 'G' }),
  );
  const g = Array.isArray(datos.guia) ? datos.guia[0] : undefined;
  if (!g) return null;
  return {
    codigo: limpio(g.co_guiavirtual) ?? codigo,
    origen: limpio(g.plantaO),
    destino: limpio(g.plantaD),
    empresa: limpio(g.empresa),
    plataforma: limpio(g.plataforma),
    placa: limpio(g.placa),
    estado: limpio(g.estado),
  };
}

/** El PDF de la guía, en base64. */
export async function pdfGuiaVirtual(codigo: string): Promise<string> {
  const { data } = await api.post<ArrayBuffer>('binesMovil/downloadPDFGuiaVirtual', `co_guiavirtual=${encodeURIComponent(codigo)}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'arraybuffer',
  });
  return aBase64(new Uint8Array(data));
}

function aBase64(bytes: Uint8Array): string {
  let binario = '';
  // Por bloques: pasar todos los bytes como argumentos de una vez supera el límite de Hermes.
  const bloque = 0x2000;
  for (let i = 0; i < bytes.length; i += bloque) {
    binario += String.fromCharCode(...bytes.subarray(i, i + bloque));
  }
  return btoa(binario);
}

/**
 * La cédula del QR del carné: los últimos 10 dígitos, como `ValidarPersonal`. Lo escrito a mano
 * se usa tal cual.
 */
export function cedulaDelQr(texto: string): string | null {
  const limpioTexto = texto.replace(/ /g, ' ').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return /(\d{10})\D*$/.exec(limpioTexto)?.[1] ?? null;
}

/** El QR de una guía virtual es solo su número. */
export const esGuiaVirtual = (texto: string) => /^\d+$/.test(texto.trim());
