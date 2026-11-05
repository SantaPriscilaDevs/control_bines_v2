import React from 'react';
import { View } from 'react-native';
import { radius, space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { useTheme } from '@/styles/useTheme';
import Icon, { type IconName } from './Icon';
import Text from './Text';
import { SENTIDOS, TONOS, type Sentido, type Tono } from './tono';

const useStyles = makeStyles(color => ({
  estado: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: space[1] },
  estadoGrande: { paddingHorizontal: space[4], paddingVertical: space[2] },
  tipo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: 6,
    paddingHorizontal: space[2],
    paddingVertical: 3,
  },
  tipoSobreMarca: { borderColor: color.onBrandBorder },
  mosaico: { borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  sinEncoger: { alignSelf: 'flex-start' },
}));

export interface StatusChipProps {
  text: string;
  tone: Tono;
  icon?: IconName;
  /** Cuando el estado es el dato principal de la pantalla (ACTIVO al validar personal). */
  large?: boolean;
}

/**
 * Etiqueta de estado: píldora rellena y en mayúsculas, porque el texto es el segundo canal además
 * del color (ENVIADO, PENDIENTE, RECHAZADO).
 */
export function StatusChip({ text, tone, icon, large = false }: StatusChipProps) {
  const styles = useStyles();
  const { color } = useTheme();
  const t = TONOS[tone];
  return (
    <View style={[styles.estado, large && styles.estadoGrande, styles.sinEncoger, { backgroundColor: color[t.fondo] }]}>
      {icon ? <Icon name={icon} size={large ? 18 : 14} color={t.contenido} /> : null}
      <Text type={large ? 'tagLg' : 'tag'} color={t.contenido} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/**
 * Etiqueta de tipo: clasifica sin informar un estado, así que va con contorno (INGRESO, sello,
 * destino). [onBrand] la dibuja sobre la cabecera navy.
 */
export function TypeTag({ text, icon, onBrand = false }: { text: string; icon?: IconName; onBrand?: boolean }) {
  const styles = useStyles();
  const colorTexto = onBrand ? 'onBrand' : 'text';
  return (
    <View style={[styles.tipo, onBrand && styles.tipoSobreMarca, styles.sinEncoger]}>
      {icon ? <Icon name={icon} size={12} color={colorTexto} /> : null}
      <Text type="tag" color={colorTexto} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/** Varias etiquetas de tipo que se acomodan en filas. */
export function TypeTags({ texts }: { texts: string[] }) {
  const styles = useStyles();
  if (texts.length === 0) return null;
  return (
    <View style={styles.fila}>
      {texts.map(texto => (
        <TypeTag key={texto} text={texto} />
      ))}
    </View>
  );
}

export interface IconTileProps {
  icon: IconName;
  tone?: Tono;
  /** Relleno con el color del sentido y el ícono en blanco. */
  sentido?: Sentido;
  size?: number;
}

/** Ícono sobre un cuadrado de fondo suave: encabeza filas de lista. */
export function IconTile({ icon, tone = 'primary', sentido, size = 36 }: IconTileProps) {
  const styles = useStyles();
  const { color } = useTheme();
  const fondo = sentido ? SENTIDOS[sentido].fondo : TONOS[tone].fondo;
  const contenido = sentido ? SENTIDOS[sentido].contenido : TONOS[tone].contenido;
  return (
    <View style={[styles.mosaico, { width: size, height: size, backgroundColor: color[fondo] }]}>
      <Icon name={icon} size={size / 2} color={contenido} />
    </View>
  );
}
