import React from 'react';
import { View } from 'react-native';
import { radius, space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { useTheme } from '@/styles/useTheme';
import Icon, { type IconName } from './Icon';
import Text from './Text';
import { TONOS, type Tono } from './tono';

export interface BannerProps {
  message: string;
  tone: Tono;
  /** En negrita, delante del mensaje. */
  title?: string;
  icon?: IconName;
  /** Un botón debajo del mensaje. */
  action?: React.ReactNode;
}

const useStyles = makeStyles(() => ({
  aviso: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: space[3],
  },
  textos: { flex: 1, gap: space[2] },
  titulo: { fontWeight: '800' },
}));

/**
 * Aviso dentro de la pantalla, no modal: guía encontrada, ya registrada, sin conexión… Se anuncia
 * solo a TalkBack al aparecer.
 */
export default function Banner({ message, tone, title, icon, action }: BannerProps) {
  const styles = useStyles();
  const { color } = useTheme();
  const t = TONOS[tone];
  return (
    <View style={[styles.aviso, { backgroundColor: color[t.fondo] }]} accessibilityLiveRegion="polite">
      <Icon name={icon ?? t.icono} size={20} color={t.contenido} />
      <View style={styles.textos}>
        <Text type="body" color={t.contenido}>
          {title ? (
            <Text type="bodyStrong" color={t.contenido} style={styles.titulo}>
              {`${title} `}
            </Text>
          ) : null}
          {message}
        </Text>
        {action}
      </View>
    </View>
  );
}
