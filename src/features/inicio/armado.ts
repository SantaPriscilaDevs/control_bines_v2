import { esDesconocida, GRUPOS, OPCIONES, type Direccion, type Evento, type Modulo } from '@/features/eventos/catalogo';
import type { OpcionMenu } from '@/features/sesion/menu';

/** Un botón de evento del Inicio. Sin conexión solo se habilitan las opciones marcadas `offline`. */
export interface BotonEvento {
  opcion: OpcionMenu;
  evento: Evento;
  habilitado: boolean;
}

export interface GrupoInicio {
  titulo: string;
  botones: BotonEvento[];
}

export interface AccesoInicio {
  opcion: OpcionMenu;
  titulo: string;
  habilitado: boolean;
  direccion?: Direccion;
}

/** Opciones que van juntas (Guías de remisión: Salida e Ingreso). */
export interface ParInicio {
  titulo: string;
  accesos: AccesoInicio[];
}

export interface SeccionInicio {
  modulo: Modulo;
  accesos: AccesoInicio[];
  pares: ParInicio[];
}

export interface Inicio {
  eventos: GrupoInicio[];
  /** Lo que no es registrar eventos: va en el menú lateral. */
  secciones: SeccionInicio[];
  /** Opciones que el ERP manda pero esta app no ubica en ningún módulo. */
  otras: AccesoInicio[];
}

export const conMenu = (inicio: Inicio) => inicio.secciones.length > 0 || inicio.otras.length > 0;
export const vacio = (inicio: Inicio) => inicio.eventos.length === 0 && !conMenu(inicio);
export const cantidadEventos = (inicio: Inicio) => inicio.eventos.reduce((n, g) => n + g.botones.length, 0);

/**
 * Ordena el menú del ERP: los eventos agrupados para el Inicio y el resto por módulo para el menú
 * lateral, en el orden del catálogo.
 */
export function armarInicio(menu: OpcionMenu[], enLinea: boolean): Inicio {
  const porId = new Map<number, OpcionMenu>();
  for (const opcion of menu) {
    if (opcion.id != null && !porId.has(opcion.id)) porId.set(opcion.id, opcion);
  }
  const habilitado = (opcion: OpcionMenu) => enLinea || opcion.disponibleSinConexion;

  const eventos = GRUPOS.flatMap(grupo => {
    const botones = grupo.eventos.flatMap(evento => {
      const opcion = porId.get(evento.id);
      return opcion ? [{ opcion, evento, habilitado: habilitado(opcion) }] : [];
    });
    return botones.length ? [{ titulo: grupo.titulo, botones }] : [];
  });

  const modulos: Modulo[] = ['Salidas', 'Consultas'];
  const secciones = modulos.flatMap(modulo => {
    const propias = OPCIONES.filter(o => o.modulo === modulo).flatMap(o => {
      const deErp = porId.get(o.id);
      return deErp ? [{ catalogo: o, acceso: { opcion: deErp, titulo: o.titulo, habilitado: habilitado(deErp), direccion: o.direccion } }] : [];
    });
    const accesos = propias.filter(p => !p.catalogo.par).map(p => p.acceso);
    const pares: ParInicio[] = [];
    for (const p of propias.filter(p => p.catalogo.par)) {
      const par = pares.find(x => x.titulo === p.catalogo.par);
      if (par) par.accesos.push(p.acceso);
      else pares.push({ titulo: p.catalogo.par!, accesos: [p.acceso] });
    }
    return accesos.length || pares.length ? [{ modulo, accesos, pares }] : [];
  });

  const vistas = new Set<string>();
  const otras = menu.flatMap(opcion => {
    const clave = opcion.id != null ? String(opcion.id) : opcion.titulo;
    if (!esDesconocida(opcion.id) || vistas.has(clave)) return [];
    vistas.add(clave);
    return [{ opcion, titulo: opcion.titulo, habilitado: habilitado(opcion) }];
  });

  return { eventos, secciones, otras };
}

/** «PEDRO SALAZAR» → «Pedro». */
export function primerNombre(nombre: string): string {
  const primero = nombre.trim().split(/\s+/)[0] ?? '';
  return primero ? primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase() : '';
}

/** «PEDRO SALAZAR» → «PS». */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p.charAt(0).toUpperCase())
    .join('');
}
