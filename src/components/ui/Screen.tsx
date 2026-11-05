import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import Text from './Text';

export interface ScreenProps {
  header: React.ReactNode;
  /** Barra de acciones abajo (Registrar, Guardar). Sube con el teclado. */
  footer?: React.ReactNode;
  /** Barra de navegación de las pantallas principales (Inicio, Historial, Perfil). */
  bottomBar?: React.ReactNode;
  /** false si el contenido maneja su propio desplazamiento (el visor de PDF). */
  scrollable?: boolean;
  children?: React.ReactNode;
}

const useStyles = makeStyles(color => ({
  raiz: { flex: 1, backgroundColor: color.bg },
  cuerpo: { flex: 1 },
  contenido: { padding: space[4], gap: space[3], flexGrow: 1 },
  pie: {
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.borderMuted,
    paddingHorizontal: space[4],
    paddingTop: space[3],
    gap: 10,
  },
}));

/**
 * Armazón de las pantallas: cabecera fija arriba, contenido con desplazamiento y, abajo, la barra
 * de acciones o la de navegación.
 */
export default function Screen({ header, footer, bottomBar, scrollable = true, children }: ScreenProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  // Con el teclado abierto la barra de navegación queda debajo de él: el pie no la descuenta.
  const [teclado, setTeclado] = useState(false);
  useEffect(() => {
    const abierto = Keyboard.addListener('keyboardDidShow', () => setTeclado(true));
    const cerrado = Keyboard.addListener('keyboardDidHide', () => setTeclado(false));
    return () => {
      abierto.remove();
      cerrado.remove();
    };
  }, []);
  return (
    <KeyboardAvoidingView style={styles.raiz} behavior="padding">
      {header}
      {scrollable ? (
        <ScrollView style={styles.cuerpo} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.cuerpo, styles.contenido]}>{children}</View>
      )}
      {footer ? <View style={[styles.pie, { paddingBottom: space[4] + (bottomBar || teclado ? 0 : insets.bottom) }]}>{footer}</View> : null}
      {bottomBar}
    </KeyboardAvoidingView>
  );
}

const useTitulo = makeStyles(() => ({
  fila: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space[3] },
  titulo: { flexShrink: 1 },
}));

/** Título de una sección, con un dato a la derecha («5 hoy»). El dato no se parte. */
export function SectionTitle({ text, aside }: { text: string; aside?: string | null }) {
  const styles = useTitulo();
  return (
    <View style={styles.fila}>
      <Text type="titleSubject" accessibilityRole="header" style={styles.titulo}>
        {text}
      </Text>
      {aside ? (
        <Text type="bodySm" color="textMuted" numberOfLines={1}>
          {aside}
        </Text>
      ) : null}
    </View>
  );
}
