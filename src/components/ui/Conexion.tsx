import React from 'react';
import { View } from 'react-native';
import { radius, space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import Icon from './Icon';
import Text from './Text';

const useStyles = makeStyles(color => ({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pastilla: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  enLinea: { backgroundColor: color.onBrandSubtle },
  sinConexion: { backgroundColor: color.warningSubtle },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.onlineDot },
  sinEncoger: { alignSelf: 'flex-start' },
}));

/**
 * «En línea» o «Sin conexión» para la cabecera navy. Con [pendientes] dice además cuánto falta
 * enviar, y [pastilla] la dibuja con fondo (Inicio e Historial).
 */
export default function Conexion({ enLinea, pendientes = 0, pastilla = false }: { enLinea: boolean; pendientes?: number; pastilla?: boolean }) {
  const styles = useStyles();
  let texto = enLinea ? 'En línea' : 'Sin conexión';
  if (pendientes > 0) texto += ` · ${pendientes} por enviar`;
  const colorTexto = pastilla && !enLinea ? 'warning' : 'onBrand';
  return (
    <View
      style={[pastilla ? styles.pastilla : styles.fila, pastilla && (enLinea ? styles.enLinea : styles.sinConexion), styles.sinEncoger]}
      accessibilityLiveRegion="polite"
    >
      {enLinea ? <View style={styles.punto} /> : <Icon name="wifi-off" size={14} color={colorTexto} />}
      <Text type="captionStrong" color={colorTexto} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

/** Pastilla con un ícono y un texto sobre la cabecera navy («PLANTA 1 · Usuario Guardia»). */
export function PastillaCabecera({ texto }: { texto: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.pastilla, styles.enLinea, styles.sinEncoger, { paddingHorizontal: space[3] }]}>
      <Icon name="map-pin" size={15} color="onBrand" />
      <Text type="captionStrong" color="onBrand">
        {texto}
      </Text>
    </View>
  );
}
