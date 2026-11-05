import { AppState } from 'react-native';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { useRed } from './red';

/** Cliente único de TanStack Query: lo que viene del servidor (plantas, guías, catálogos). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    // Casi todo lo que se envía escribe en producción: nunca se reintenta solo.
    mutations: { retry: 0 },
  },
});

/** Claves de consulta: una sola fuente de verdad para invalidar. */
export const queryKeys = {
  plantas: ['plantas'] as const,
  numeroMovimiento: (planta: string) => ['numeroMovimiento', planta] as const,
  catalogosRemision: ['catalogosRemision'] as const,
  guiasRemision: (filtros: object) => ['guiasRemision', filtros] as const,
};

let conectado = false;

/** Conecta el foco de la app y la red con TanStack. Idempotente. */
export function conectarQueryClient(): void {
  if (conectado) return;
  conectado = true;
  focusManager.setEventListener(avisar => {
    const suscripcion = AppState.addEventListener('change', estado => avisar(estado === 'active'));
    return () => suscripcion.remove();
  });
  onlineManager.setEventListener(avisar => {
    avisar(useRed.getState().enLinea);
    return useRed.subscribe(estado => avisar(estado.enLinea));
  });
}
