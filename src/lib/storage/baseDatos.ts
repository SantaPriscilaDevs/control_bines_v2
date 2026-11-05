import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

/**
 * Base local: la cola de lo registrado sin conexión y el historial del equipo. Las tablas son las
 * de Room en la versión Kotlin (`disparos` y `movimientos_guia`), con los campos que piden los
 * endpoints para reenviar cada registro tal cual.
 */
const MIGRACIONES: string[] = [
  `CREATE TABLE disparos (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     guia TEXT NOT NULL,
     id_evento INTEGER NOT NULL,
     tipo TEXT NOT NULL,
     tipo_transaccion TEXT NOT NULL,
     observaciones TEXT NOT NULL,
     co_planta TEXT NOT NULL,
     co_camaronera INTEGER NOT NULL DEFAULT 0,
     nombre_camaronera TEXT,
     sin_pesca INTEGER NOT NULL DEFAULT 0,
     fecha_hora TEXT NOT NULL,
     dia TEXT NOT NULL,
     estado TEXT NOT NULL,
     mensaje TEXT
   );
   CREATE INDEX disparos_dia ON disparos(dia);
   CREATE INDEX disparos_estado ON disparos(estado);
   CREATE TABLE movimientos_guia (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     guia TEXT NOT NULL,
     serie TEXT NOT NULL,
     tipo TEXT NOT NULL,
     tipo_guia TEXT NOT NULL,
     co_planta TEXT NOT NULL,
     id_usuario TEXT NOT NULL,
     nombre_usuario TEXT NOT NULL,
     fecha_hora TEXT NOT NULL,
     total_manual INTEGER NOT NULL,
     observaciones TEXT NOT NULL,
     tags TEXT NOT NULL
   );`,
];

let base: SQLiteDatabase | null = null;

/** La base abierta y al día. Se abre la primera vez que se usa. */
export function baseDatos(): SQLiteDatabase {
  if (base) return base;
  const abierta = openDatabaseSync('mobile_app.db');
  abierta.execSync('PRAGMA journal_mode = WAL;');
  const actual = abierta.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  for (let version = actual; version < MIGRACIONES.length; version++) {
    abierta.withTransactionSync(() => {
      abierta.execSync(MIGRACIONES[version]);
      abierta.execSync(`PRAGMA user_version = ${version + 1}`);
    });
  }
  base = abierta;
  return abierta;
}

interface Cambios {
  version: number;
}

/** Sube con cada escritura: las pantallas que listan registros vuelven a consultar. */
export const useCambiosBase = create<Cambios>(() => ({ version: 0 }));

export const avisarCambio = () => useCambiosBase.setState(s => ({ version: s.version + 1 }));
