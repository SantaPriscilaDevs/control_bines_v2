import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { escucharGatillo } from './index';

/**
 * Llama a [alPresionar] cada vez que se aprieta el gatillo, solo mientras la pantalla está visible:
 * una lectura nunca llega a otra pantalla, como pasaba con el Handler global de la app vieja.
 */
export function useGatillo(alPresionar: () => void, alSoltar?: () => void): void {
  const presionar = useRef(alPresionar);
  const soltar = useRef(alSoltar);
  useEffect(() => {
    presionar.current = alPresionar;
    soltar.current = alSoltar;
  });
  useFocusEffect(
    useCallback(
      () =>
        escucharGatillo(
          () => presionar.current(),
          () => soltar.current?.(),
        ),
      [],
    ),
  );
}
