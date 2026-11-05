import React, { useState } from 'react';
import { Pressable, TextInput, View, type KeyboardTypeOptions, type ReturnKeyTypeOptions, type TextInputProps } from 'react-native';
import { ESCALA_MAXIMA_LETRA, hit, radius, space, type as roles } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { useEscalaLetra, useTheme } from '@/styles/useTheme';
import Icon, { type IconName } from './Icon';
import Text from './Text';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (texto: string) => void;
  placeholder?: string;
  error?: string | null;
  leadingIcon?: IconName;
  /** Oculta el texto y agrega el botón para mostrarlo. */
  password?: boolean;
  editable?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  maxLength?: number;
  autoComplete?: TextInputProps['autoComplete'];
}

const useStyles = makeStyles(color => ({
  campo: { gap: 6 },
  caja: {
    minHeight: hit.control,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  enfocada: { borderWidth: 2, borderColor: color.primary, paddingHorizontal: 13 },
  conError: { borderColor: color.danger },
  deshabilitada: { opacity: 0.45 },
  entrada: { flex: 1, color: color.text, paddingVertical: space[2] },
  ojo: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
}));

/** Campo de GS Mobile: rótulo arriba, caja de 48 con contorno y, si hace falta, el error debajo. */
export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  leadingIcon,
  password = false,
  editable = true,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
  maxLength,
  autoComplete,
}: TextFieldProps) {
  const styles = useStyles();
  const { color } = useTheme();
  const escala = useEscalaLetra();
  const [enfocada, setEnfocada] = useState(false);
  const [visible, setVisible] = useState(false);
  const letra = escala.factor === 1 ? roles.body : { ...roles.body, fontSize: roles.body.fontSize * escala.factor, lineHeight: roles.body.lineHeight * escala.factor };
  return (
    <View style={styles.campo}>
      <Text type="bodySmStrong">{label}</Text>
      <View style={[styles.caja, enfocada && styles.enfocada, !!error && styles.conError, !editable && styles.deshabilitada]}>
        {leadingIcon ? <Icon name={leadingIcon} size={18} color={enfocada ? 'primary' : 'textMuted'} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={color.textMuted}
          secureTextEntry={password && !visible}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          selectionColor={color.primary}
          cursorColor={color.primary}
          allowFontScaling={escala.sigueAlTelefono}
          maxFontSizeMultiplier={ESCALA_MAXIMA_LETRA}
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          onFocus={() => setEnfocada(true)}
          onBlur={() => setEnfocada(false)}
          style={[letra, styles.entrada]}
        />
        {password ? (
          <Pressable
            onPress={() => setVisible(v => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={styles.ojo}
          >
            <Icon name={visible ? 'eye-off' : 'eye'} size={18} color="textMuted" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text type="bodySm" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
