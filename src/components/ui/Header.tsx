import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hit, radius, space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import Icon, { type IconName } from './Icon';
import Text from './Text';

export interface HeaderProps {
  title: string;
  /** Sobretítulo en mayúsculas: el módulo o el grupo del evento. */
  overline?: string;
  /** El título grande del Inicio; las pantallas internas van con el mediano. */
  large?: boolean;
  /** Botón a la izquierda (volver, menú). */
  navigation?: React.ReactNode;
  /** Botones a la derecha. */
  actions?: React.ReactNode;
  /** Debajo del título, sobre el mismo navy: planta, conexión, dirección. */
  children?: React.ReactNode;
}

const useStyles = makeStyles(color => ({
  cabecera: {
    backgroundColor: color.brand,
    borderBottomLeftRadius: radius.header,
    borderBottomRightRadius: radius.header,
    paddingHorizontal: space[4],
    paddingBottom: 18,
    gap: 14,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  titulos: { flex: 1 },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  boton: {
    width: hit.min,
    height: hit.min,
    borderRadius: radius.control,
    backgroundColor: color.onBrandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPresionado: { opacity: 0.7 },
}));

/**
 * Cabecera navy de GS Mobile con las esquinas inferiores redondeadas. Se extiende bajo la barra de
 * estado.
 */
export default function Header({ title, overline, large = false, navigation, actions, children }: HeaderProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.cabecera, { paddingTop: insets.top + space[4] }]}>
      <View style={styles.fila}>
        {navigation}
        <View style={styles.titulos} accessibilityRole="header">
          {overline ? (
            <Text type="overline" color="onBrandMuted" numberOfLines={1}>
              {overline}
            </Text>
          ) : null}
          <Text type={large ? 'displayMd' : 'titleXl'} color="onBrand">
            {title}
          </Text>
        </View>
        {actions ? <View style={styles.acciones}>{actions}</View> : null}
      </View>
      {children}
    </View>
  );
}

export interface HeaderButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
}

/** Botón cuadrado de 44 sobre la cabecera navy (volver, menú, cerrar sesión). */
export function HeaderButton({ icon, accessibilityLabel, onPress }: HeaderButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
    >
      <Icon name={icon} size={20} color="onBrand" />
    </Pressable>
  );
}
