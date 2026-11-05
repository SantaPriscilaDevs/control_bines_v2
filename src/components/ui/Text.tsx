import React from 'react';
import { Text as RNText, type StyleProp, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { ESCALA_MAXIMA_LETRA, type as roles, type ColorToken, type TypeRole } from '@/styles/theme';
import { useEscalaLetra, useTheme } from '@/styles/useTheme';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  type?: TypeRole;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

/**
 * Texto con un rol tipográfico y un color del tema. Respeta el tamaño de letra de Perfil: Normal y
 * Grande lo fijan; Sistema sigue al teléfono hasta 1,3 veces.
 */
export default function Text({ type = 'body', color = 'text', align, style, children, ...rest }: TextProps) {
  const { color: esquema } = useTheme();
  const escala = useEscalaLetra();
  const rol = roles[type];
  const fijo = escala.factor === 1 ? null : { fontSize: rol.fontSize * escala.factor, lineHeight: rol.lineHeight * escala.factor };
  return (
    <RNText
      allowFontScaling={escala.sigueAlTelefono}
      maxFontSizeMultiplier={ESCALA_MAXIMA_LETRA}
      {...rest}
      style={[rol, fijo, { color: esquema[color] }, align ? { textAlign: align } : null, style]}
    >
      {children}
    </RNText>
  );
}
