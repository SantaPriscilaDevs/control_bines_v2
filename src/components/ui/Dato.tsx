import React from 'react';
import { Pressable, View } from 'react-native';
import { hit, radius, space, type TypeRole } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import Icon from './Icon';
import Text from './Text';

const useStyles = makeStyles(color => ({
  dato: { flex: 1, minWidth: 0 },
  datoSolo: { alignSelf: 'stretch' },
  dos: { flexDirection: 'row', gap: space[3] },
  selector: { gap: 6 },
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
  cajaPresionada: { backgroundColor: color.surfaceContainer },
  deshabilitado: { opacity: 0.45 },
  valor: { flex: 1, paddingVertical: 10 },
}));

/** El ERP manda «-» o vacío cuando no tiene el dato. */
export const conValor = (texto: string | null | undefined): texto is string => !!texto && texto.trim() !== '' && texto.trim() !== '-';

export interface DatoProps {
  rotulo: string;
  valor: string | null | undefined;
  /** Números y códigos: guía, placa, cédula. */
  mono?: boolean;
  /** La placa, que se compara con el camión. */
  grande?: boolean;
  /** Ocupa su parte de una fila de dos. */
  enFila?: boolean;
}

/** Un dato con su rótulo en mayúsculas: «PLACA / GBA-1234». */
export function Dato({ rotulo, valor, mono = false, grande = false, enFila = false }: DatoProps) {
  const styles = useStyles();
  let tipo: TypeRole = 'bodyStrong';
  if (grande) tipo = 'numMd';
  else if (mono) tipo = 'mono';
  return (
    <View style={enFila ? styles.dato : styles.datoSolo}>
      <Text type="label" color="textMuted">
        {rotulo}
      </Text>
      <Text type={tipo}>{conValor(valor) ? valor.trim() : '—'}</Text>
    </View>
  );
}

/** Dos datos lado a lado. */
export function Datos({ children }: { children: React.ReactNode }) {
  return <View style={useStyles().dos}>{children}</View>;
}

/** Fila que abre una hoja de opciones: «Tipo de guía · Traslado ▾». */
export function Selector({ rotulo, valor, onPress, disabled = false }: { rotulo: string; valor: string | null; onPress: () => void; disabled?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.selector}>
      <Text type="bodySmStrong">{rotulo}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${valor ?? 'sin elegir'}`}
        style={({ pressed }) => [styles.caja, pressed && styles.cajaPresionada, disabled && styles.deshabilitado]}
      >
        <View style={styles.valor}>
          <Text type="body" color={valor ? 'text' : 'textMuted'} numberOfLines={2}>
            {valor ?? 'Elegir'}
          </Text>
        </View>
        <Icon name="chevron-down" size={18} color="textMuted" />
      </Pressable>
    </View>
  );
}
