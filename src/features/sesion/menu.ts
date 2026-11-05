/**
 * Una opción del menú que manda el ERP (`binesMovil/menu/{planta}`). [json] es el objeto tal como
 * llegó: de ahí sale la potencia y el modo del lector RFID de cada opción.
 */
export interface OpcionMenu {
  id: number | null;
  titulo: string;
  actividad: string;
  disponibleSinConexion: boolean;
  json: Record<string, unknown>;
}

/** Planta elegida y cómo la ve el usuario en ella. */
export interface Planta {
  id: string;
  nombre: string;
  rol: string;
  nombreUsuario: string;
  idUsuario: string;
}

/** Establecimiento que se puede elegir. */
export interface PlantaDisponible {
  id: number;
  nombre: string;
}

/** Camaronera del selector de los eventos en camaronera. */
export interface Camaronera {
  id: number;
  nombre: string;
}

const parsear = (texto: string | null | undefined): unknown => {
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
};

const entero = (valor: unknown): number | null => {
  const numero = typeof valor === 'number' ? valor : typeof valor === 'string' && valor.trim() ? Number(valor) : NaN;
  return Number.isInteger(numero) ? numero : null;
};

/** Lee el menú. Las opciones sin título se descartan en vez de cortar la lista. */
export function leerMenu(menuJson: string | null | undefined): OpcionMenu[] {
  const arreglo = parsear(menuJson);
  if (!Array.isArray(arreglo)) return [];
  return arreglo.flatMap(elemento => {
    if (!elemento || typeof elemento !== 'object' || Array.isArray(elemento)) return [];
    const objeto = elemento as Record<string, unknown>;
    const titulo = typeof objeto.title === 'string' ? objeto.title.trim() : '';
    if (!titulo) return [];
    return [
      {
        id: entero(objeto.id),
        titulo,
        actividad: typeof objeto.activity === 'string' ? objeto.activity : '',
        disponibleSinConexion: objeto.offline === true,
        json: objeto,
      },
    ];
  });
}

/** Lista de `produccion/establecimiento`, ordenada por nombre. */
export function leerEstablecimientos(datos: unknown): PlantaDisponible[] {
  if (!Array.isArray(datos)) return [];
  return datos
    .flatMap(elemento => {
      const objeto = (elemento ?? {}) as Record<string, unknown>;
      const id = entero(objeto.co_establecimiento);
      const nombre = typeof objeto.nombre_corto === 'string' ? objeto.nombre_corto.trim() : '';
      return id === null || !nombre ? [] : [{ id, nombre }];
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Las camaroneras guardadas al elegir la planta (`produccion/establecimiento?es_camaronera=1`). */
export function leerCamaroneras(texto: string | null | undefined): Camaronera[] {
  return leerEstablecimientos(parsear(texto));
}
