import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { hit, radius, space, type ColorToken } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { useTheme } from '@/styles/useTheme';
import Icon, { type IconName } from './Icon';
import Text from './Text';
import { SENTIDOS, type Sentido } from './tono';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /**
   * Relleno para la acción principal, con contorno para la secundaria y con contorno rojo para la
   * que no tiene vuelta atrás (cerrar sesión).
   */
  variant?: ButtonVariant;
  /** Botón de un evento: relleno verde (ingreso) o rojo (salida), con texto blanco y la flecha. */
  sentido?: Sentido;
  icon?: IconName;
  disabled?: boolean;
  /** 52 por defecto; `md` mide 44, para botones dentro de una fila. */
  size?: 'md' | 'lg';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const useStyles = makeStyles(color => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lg: { minHeight: hit.button },
  md: { minHeight: hit.min, paddingHorizontal: space[3] },
  primary: { backgroundColor: color.primary },
  primaryPressed: { backgroundColor: color.primaryActive },
  secondary: { backgroundColor: color.surface, borderColor: color.borderStrong },
  danger: { backgroundColor: color.surface, borderColor: color.danger },
  outlinePressed: { backgroundColor: color.surfaceContainer },
  // Un evento deshabilitado (sin conexión) pasa a gris, como el resto de los controles.
  sentidoDeshabilitado: { backgroundColor: color.surfaceContainer },
  sentidoPresionado: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  contenido: { flexShrink: 1 },
}));

const TEXTO: Record<ButtonVariant, ColorToken> = { primary: 'textOnPrimary', secondary: 'primary', danger: 'danger' };

export default function Button({
  label,
  onPress,
  variant = 'primary',
  sentido,
  icon,
  disabled = false,
  size = 'lg',
  accessibilityLabel,
  style,
}: ButtonProps) {
  const styles = useStyles();
  const { color } = useTheme();
  const deSentido = sentido ? SENTIDOS[sentido] : null;

  let colorTexto: ColorToken = TEXTO[variant];
  if (deSentido) colorTexto = disabled ? 'textMuted' : deSentido.contenido;
  const icono = icon ?? deSentido?.icono;

  const fondo = (presionado: boolean): StyleProp<ViewStyle> => {
    if (deSentido) {
      if (disabled) return styles.sentidoDeshabilitado;
      return [{ backgroundColor: color[deSentido.fondo] }, presionado && styles.sentidoPresionado];
    }
    if (variant === 'primary') return [styles.primary, presionado && styles.primaryPressed];
    return [styles[variant], presionado && styles.outlinePressed];
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.base, styles[size], fondo(pressed), disabled && !deSentido && styles.disabled, style]}
    >
      {icono ? <Icon name={icono} size={18} color={colorTexto} /> : null}
      <View style={styles.contenido}>
        <Text type="bodyStrong" color={colorTexto} numberOfLines={2} align="center">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
