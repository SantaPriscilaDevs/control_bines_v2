import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space, type SpaceToken } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';

export interface CardProps {
  /** Token de espacio, o 0 para contenido a ras (listas dentro de la tarjeta). */
  padding?: SpaceToken | 0;
  /** Separación entre los hijos. */
  gap?: SpaceToken | 0;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const useStyles = makeStyles(color => ({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.container,
    borderWidth: 1,
    borderColor: color.borderMuted,
    overflow: 'hidden',
  },
}));

/** Tarjeta a lo ancho con el contorno suave de GS Mobile. En oscuro la separa el color, sin sombra. */
export default function Card({ padding = 3, gap = 0, style, children }: CardProps) {
  const styles = useStyles();
  return (
    <View style={[styles.card, { padding: padding === 0 ? 0 : space[padding], gap: gap === 0 ? 0 : space[gap] }, style]}>
      {children}
    </View>
  );
}
