import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { escucharCodigos, lectorCodigos } from './index';
import { useGatillo } from './useGatillo';

/** El mismo código dentro de este tiempo es la misma lectura. */
const REPETIDO_MS = 2_000;

interface Opciones {
  /** Lo leído, sin espacios en los extremos. */
  alLeer: (texto: string) => void;
  /** El lector no se pudo usar (no es un handheld, falta el permiso…). */
  alFallar: (motivo: string) => void;
  /** Si la pantalla no puede recibir otra lectura ahora (consultando, registrando). */
  puedeLeer?: () => boolean;
}

/**
 * Lectura de códigos de barras y QR mientras la pantalla está visible, por el camino que tenga el
 * equipo: en el HY820 el gatillo lee con el SDK de Hopeland; en el HY416 y el HY830 lee el servicio
 * del sistema y el código llega solo.
 */
export function useLectorCodigos({ alLeer, alFallar, puedeLeer }: Opciones): void {
  const llamadas = useRef({ alLeer, alFallar, puedeLeer });
  useEffect(() => {
    llamadas.current = { alLeer, alFallar, puedeLeer };
  });
  const libre = () => llamadas.current.puedeLeer?.() ?? true;

  // En el HY820 el SDK lee a través del servicio del sistema, que además avisa por broadcast: el
  // mismo código puede llegar por los dos caminos. Se atiende una sola vez.
  const ultimo = useRef({ texto: '', momento: 0 });
  const entregar = (texto: string) => {
    const ahora = Date.now();
    if (texto === ultimo.current.texto && ahora - ultimo.current.momento < REPETIDO_MS) return;
    ultimo.current = { texto, momento: ahora };
    llamadas.current.alLeer(texto);
  };

  // Una lectura por vez: las pulsaciones mientras el lector está encendido no se encolan.
  const leyendo = useRef(false);
  useGatillo(async () => {
    if (leyendo.current || !libre()) return;
    leyendo.current = true;
    try {
      const lectura = await lectorCodigos.leer();
      if (lectura.tipo === 'leido') entregar(lectura.texto);
      else if (lectura.tipo === 'noDisponible') llamadas.current.alFallar(lectura.motivo);
    } finally {
      leyendo.current = false;
    }
  });

  useFocusEffect(
    useCallback(
      () =>
        escucharCodigos(texto => {
          if (libre()) entregar(texto);
        }),
      [],
    ),
  );
}
