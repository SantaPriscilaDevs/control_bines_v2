import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import Text from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Al lado del título («Traslado», «12 camaroneras»). */
  aside?: string | null;
  children?: React.ReactNode;
}

const useStyles = makeStyles(color => ({
  fondo: { flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  cierre: { flex: 1 },
  hoja: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.overlay,
    borderTopRightRadius: radius.overlay,
    maxHeight: '88%',
  },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill, backgroundColor: color.border, marginTop: space[3] },
  contenido: { paddingHorizontal: space[4], paddingTop: space[3], gap: space[3] },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  titulo: { flex: 1 },
}));

/**
 * Hoja inferior para elegir una opción o ver el detalle de algo. Se cierra tocando fuera o con el
 * botón atrás del equipo.
 */
export default function Sheet({ visible, onClose, title, aside, children }: SheetProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.fondo}>
        <Pressable style={styles.cierre} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" />
        <View style={styles.hoja}>
          <View style={styles.asa} />
          <ScrollView
            contentContainerStyle={[styles.contenido, { paddingBottom: space[4] + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            {title ? (
              <View style={styles.encabezado}>
                <Text type="titleMd" style={styles.titulo} accessibilityRole="header">
                  {title}
                </Text>
                {aside ? (
                  <Text type="bodySm" color="textMuted">
                    {aside}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
