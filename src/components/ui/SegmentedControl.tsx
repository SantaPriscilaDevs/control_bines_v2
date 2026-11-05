import React from 'react';
import { Pressable, View } from 'react-native';
import { radius, shadow } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { useTheme } from '@/styles/useTheme';
import Text from './Text';
import { SENTIDOS, type Sentido } from './tono';

export interface SegmentedOption<V extends string | number | boolean> {
  value: V;
  label: string;
  /** La opción elegida se rellena con el color del sentido (verde Ingreso, rojo Salida). */
  sentido?: Sentido;
}

export interface SegmentedControlProps<V extends string | number | boolean> {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (valor: V) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

const useStyles = makeStyles((color, scheme) => ({
  pista: {
    flexDirection: 'row',
    backgroundColor: color.surfaceContainer,
    borderRadius: radius.control,
    padding: 3,
    gap: 3,
  },
  opcion: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control - 3,
    paddingHorizontal: 6,
  },
  elegida: { backgroundColor: color.surface, ...(scheme === 'light' ? shadow.raised : shadow.none) },
  presionada: { backgroundColor: color.surfaceContainerHigh },
  deshabilitado: { opacity: 0.45 },
}));

/** Control segmentado de GS Mobile (Claro / Oscuro / Sistema). Mide 44 de alto, el mínimo táctil. */
export default function SegmentedControl<V extends string | number | boolean>({
  options,
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
}: SegmentedControlProps<V>) {
  const styles = useStyles();
  const { color } = useTheme();
  return (
    <View style={[styles.pista, disabled && styles.deshabilitado]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map(opcion => {
        const elegida = opcion.value === value;
        const sentido = elegida && opcion.sentido ? SENTIDOS[opcion.sentido] : null;
        return (
          <Pressable
            key={String(opcion.value)}
            onPress={() => !elegida && onChange(opcion.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={opcion.label}
            accessibilityState={{ selected: elegida, disabled }}
            style={({ pressed }) => [
              styles.opcion,
              elegida && styles.elegida,
              sentido ? { backgroundColor: color[sentido.fondo] } : null,
              pressed && !elegida && styles.presionada,
            ]}
          >
            {({ pressed }) => (
              <Text
                type={elegida ? 'bodySmStrong' : 'bodySm'}
                color={sentido ? sentido.contenido : elegida || pressed ? 'text' : 'textMuted'}
                numberOfLines={1}
              >
                {opcion.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
