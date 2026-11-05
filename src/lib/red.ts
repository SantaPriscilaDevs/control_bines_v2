import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

/**
 * En las plantas no hay salida a internet: se mira solo si hay una red, no si responde un sitio
 * externo (eso marcaría «Sin conexión» con el servidor al alcance).
 */
NetInfo.configure({ reachabilityShouldRun: () => false });

const conectado = (estado: NetInfoState) => estado.isConnected === true;

interface EstadoRed {
  enLinea: boolean;
}

/** Si el equipo tiene red ahora. Arranca en línea y se corrige con el primer aviso del sistema. */
export const useRed = create<EstadoRed>(() => ({ enLinea: true }));

let escuchando = false;

/** Empieza a seguir la red. Se llama una vez al arrancar la app. */
export function escucharRed(): void {
  if (escuchando) return;
  escuchando = true;
  NetInfo.fetch().then(estado => useRed.setState({ enLinea: conectado(estado) }));
  NetInfo.addEventListener(estado => {
    const enLinea = conectado(estado);
    if (enLinea !== useRed.getState().enLinea) useRed.setState({ enLinea });
  });
}

export const enLineaAhora = () => useRed.getState().enLinea;

/** Hook: si hay red. */
export const useEnLinea = () => useRed(s => s.enLinea);
