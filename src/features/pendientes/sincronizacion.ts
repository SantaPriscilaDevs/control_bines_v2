import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { enLineaAhora, useRed } from '@/lib/red';
import { useCambiosBase } from '@/lib/storage/baseDatos';
import * as disparos from '@/features/eventos/disparos';
import * as remision from '@/features/remision/servicio';

const REINTENTO_MS = 5 * 60 * 1000;

let iniciada = false;

/**
 * Envía lo que se guardó sin conexión (eventos y guías de remisión) al volver la red, al volver la
 * app al frente y, mientras haya red, cada pocos minutos (por si el ERP no respondía). Arranca con
 * la aplicación, no con una pantalla.
 */
export function iniciarSincronizacion(): void {
  if (iniciada) return;
  iniciada = true;
  disparos.borrarAnteriores().catch(() => undefined);
  enviarAhora();
  useRed.subscribe((estado, anterior) => {
    if (estado.enLinea && !anterior.enLinea) enviarAhora();
  });
  AppState.addEventListener('change', estado => {
    if (estado === 'active') enviarAhora();
  });
  setInterval(enviarAhora, REINTENTO_MS);
}

/** Para enviar enseguida (por ejemplo, desde el Historial). */
export function enviarAhora(): void {
  if (!enLineaAhora()) return;
  disparos
    .enviarPendientes()
    .catch(() => 0)
    .then(() => remision.enviarPendientes())
    .catch(() => 0);
}

export interface ConteoPendientes {
  disparos: number;
  movimientosBines: number;
  total: number;
}

/** Cuánto falta enviar. Se actualiza con cada cambio en la base local. */
export function usePendientes(): ConteoPendientes {
  const version = useCambiosBase(s => s.version);
  const [conteo, setConteo] = useState<ConteoPendientes>({ disparos: 0, movimientosBines: 0, total: 0 });
  useEffect(() => {
    let vigente = true;
    Promise.all([disparos.contarPendientes(), remision.cantidadPendientes()])
      .then(([d, m]) => vigente && setConteo({ disparos: d, movimientosBines: m, total: d + m }))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [version]);
  return conteo;
}

/** Lo registrado hoy en este equipo, lo más nuevo primero. Se actualiza con cada cambio. */
export function useDisparosDeHoy(): disparos.Disparo[] {
  const version = useCambiosBase(s => s.version);
  const [lista, setLista] = useState<disparos.Disparo[]>([]);
  useEffect(() => {
    let vigente = true;
    disparos
      .delDia()
      .then(filas => vigente && setLista(filas))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [version]);
  return lista;
}
