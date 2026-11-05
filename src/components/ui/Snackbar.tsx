import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { radius, space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import Text from './Text';

interface Confirmaciones {
  texto: string | null;
  id: number;
}

const useConfirmaciones = create<Confirmaciones>(() => ({ texto: null, id: 0 }));

/**
 * Muestra una confirmación abajo, sin bloquear: «Salida de 000123 registrada con 24 bines». Se va
 * sola a los 4 segundos.
 */
export const confirmar = (texto: string) => useConfirmaciones.setState(s => ({ texto, id: s.id + 1 }));

const useStyles = makeStyles(color => ({
  capa: { position: 'absolute', left: space[4], right: space[4] },
  aviso: { backgroundColor: color.brand, borderRadius: radius.control, paddingHorizontal: space[4], paddingVertical: 14 },
}));

/** Va una sola vez, sobre toda la app. */
export function SnackbarHost() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { texto, id } = useConfirmaciones();
  useEffect(() => {
    if (!texto) return;
    const temporizador = setTimeout(() => useConfirmaciones.setState(s => (s.id === id ? { texto: null } : s)), 4_000);
    return () => clearTimeout(temporizador);
  }, [texto, id]);
  if (!texto) return null;
  return (
    <View style={[styles.capa, { bottom: insets.bottom + space[4] }]} pointerEvents="none">
      <View style={styles.aviso} accessibilityLiveRegion="polite">
        <Text type="body" color="onBrand">
          {texto}
        </Text>
      </View>
    </View>
  );
}
