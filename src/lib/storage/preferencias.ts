import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

/** Como en GS Mobile: claro, oscuro o el que tenga el teléfono. */
export type Tema = 'claro' | 'oscuro' | 'sistema';

/** Normal y Grande fijan el tamaño; Sistema sigue al teléfono hasta 1,3 veces. */
export type TamanoLetra = 'normal' | 'grande' | 'sistema';

const CLAVES = {
  tema: 'preferencias.tema',
  letra: 'preferencias.letra',
  ultimaPlanta: 'preferencias.ultimaPlanta',
} as const;

function leer<T extends string>(clave: string, validos: readonly T[], porDefecto: T): T {
  try {
    const guardado = Storage.getItemSync(clave);
    return validos.find(v => v === guardado) ?? porDefecto;
  } catch {
    return porDefecto;
  }
}

function leerNumero(clave: string): number | null {
  try {
    const guardado = Number(Storage.getItemSync(clave));
    return Number.isInteger(guardado) && guardado > 0 ? guardado : null;
  } catch {
    return null;
  }
}

interface Preferencias {
  tema: Tema;
  letra: TamanoLetra;
  /** Última planta elegida en este equipo: aparece primera y marcada al elegir planta. */
  ultimaPlanta: number | null;
  cambiarTema: (tema: Tema) => void;
  cambiarLetra: (letra: TamanoLetra) => void;
  recordarPlanta: (id: number) => void;
}

/**
 * Preferencias del equipo, no de la sesión: siguen igual al cambiar de usuario. Se leen de forma
 * sincrónica para que el primer cuadro ya tenga el tema y el tamaño de letra elegidos.
 */
export const usePreferencias = create<Preferencias>(set => ({
  tema: leer<Tema>(CLAVES.tema, ['claro', 'oscuro', 'sistema'], 'sistema'),
  letra: leer<TamanoLetra>(CLAVES.letra, ['normal', 'grande', 'sistema'], 'sistema'),
  ultimaPlanta: leerNumero(CLAVES.ultimaPlanta),
  cambiarTema: tema => {
    Storage.setItemSync(CLAVES.tema, tema);
    set({ tema });
  },
  cambiarLetra: letra => {
    Storage.setItemSync(CLAVES.letra, letra);
    set({ letra });
  },
  recordarPlanta: id => {
    Storage.setItemSync(CLAVES.ultimaPlanta, String(id));
    set({ ultimaPlanta: id });
  },
}));
