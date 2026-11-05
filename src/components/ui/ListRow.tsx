import React from 'react';
import { Pressable, View } from 'react-native';
import { space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import Text from './Text';

export interface ListRowProps {
  headline: string;
  supporting?: string | null;
  /** Titular en monoespaciada: números de guía y placas. */
  monospace?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}

const useStyles = makeStyles(color => ({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: 14,
    paddingVertical: space[3],
    minHeight: 56,
  },
  presionada: { backgroundColor: color.surfaceContainer },
  textos: { flex: 1 },
}));

/** Fila de una lista dentro de una tarjeta sin relleno. */
export default function ListRow({ headline, supporting, monospace, leading, trailing, onPress, accessibilityLabel }: ListRowProps) {
  const styles = useStyles();
  const contenido = (
    <>
      {leading}
      <View style={styles.textos}>
        <Text type={monospace ? 'mono' : 'bodyStrong'}>{headline}</Text>
        {supporting ? (
          <Text type="caption" color="textMuted">
            {supporting}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );
  if (!onPress) return <View style={styles.fila}>{contenido}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.fila, pressed && styles.presionada]}
    >
      {contenido}
    </Pressable>
  );
}

const useDivisor = makeStyles(color => ({ divisor: { height: 1, backgroundColor: color.borderMuted } }));

/** Divisor entre filas de una tarjeta. */
export function Divider() {
  return <View style={useDivisor().divisor} />;
}
