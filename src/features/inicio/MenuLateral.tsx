import React, { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconTile, Text, type IconName } from '@/components/ui';
import { hit, radius, space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { ID_EXPORTACION, ID_VALIDAR_PERSONAL } from '@/features/eventos/catalogo';
import type { OpcionMenu } from '@/features/sesion/menu';
import { usePlantaActiva } from '@/features/sesion/sesion';
import type { AccesoInicio, Inicio } from './armado';

const useStyles = makeStyles(color => ({
  fondo: { flex: 1, backgroundColor: color.scrim },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: color.surface,
    borderTopRightRadius: radius.overlay,
    borderBottomRightRadius: radius.overlay,
    overflow: 'hidden',
  },
  cabecera: { backgroundColor: color.brand, paddingHorizontal: space[4], paddingBottom: space[4], gap: 2 },
  lista: { paddingHorizontal: space[2], paddingVertical: space[2] },
  seccion: { paddingStart: space[2], paddingTop: space[4], paddingBottom: space[1] },
  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: hit.button,
    borderRadius: radius.control,
    paddingHorizontal: space[2],
    paddingVertical: 6,
  },
  presionada: { backgroundColor: color.surfaceContainer },
  deshabilitada: { opacity: 0.45 },
  textos: { flex: 1 },
}));

const ANCHO = 300;

function iconoOpcion(id: number | null): IconName {
  if (id === ID_EXPORTACION) return 'ship';
  if (id === ID_VALIDAR_PERSONAL) return 'user-check';
  return 'file-text';
}

/**
 * El menú lateral: lo que no es registrar eventos (guías de remisión, salida de exportación,
 * consultas), por módulo y en el orden del catálogo. Sin conexión, lo que la necesita se atenúa.
 */
export default function MenuLateral({
  visible,
  inicio,
  alCerrar,
  alAbrir,
}: {
  visible: boolean;
  inicio: Inicio;
  alCerrar: () => void;
  alAbrir: (opcion: OpcionMenu) => void;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sesion = usePlantaActiva();
  const ancho = Math.min(ANCHO, width - 48);
  const [desplazamiento] = useState(() => new Animated.Value(-ancho));

  useEffect(() => {
    if (visible) {
      desplazamiento.setValue(-ancho);
      Animated.timing(desplazamiento, { toValue: 0, duration: 190, useNativeDriver: true }).start();
    }
  }, [visible, ancho, desplazamiento]);

  const entrada = (acceso: AccesoInicio, titulo: string, icono: IconName) => (
    <Pressable
      key={`${acceso.opcion.id}-${titulo}`}
      onPress={() => alAbrir(acceso.opcion)}
      disabled={!acceso.habilitado}
      accessibilityRole="button"
      accessibilityLabel={acceso.habilitado ? titulo : `${titulo}. Requiere conexión`}
      style={({ pressed }) => [styles.entrada, pressed && styles.presionada, !acceso.habilitado && styles.deshabilitada]}
    >
      <IconTile icon={icono} size={32} sentido={acceso.direccion} />
      <View style={styles.textos}>
        <Text type="bodyStrong">{titulo}</Text>
        {!acceso.habilitado ? (
          <Text type="caption" color="textMuted">
            Requiere conexión
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  const titulo = (texto: string) => (
    <Text type="overline" color="textMuted" accessibilityRole="header" style={styles.seccion}>
      {texto}
    </Text>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={alCerrar} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.fondo} onPress={alCerrar} accessibilityRole="button" accessibilityLabel="Cerrar menú" />
      <Animated.View style={[styles.panel, { width: ancho, transform: [{ translateX: desplazamiento }] }]}>
        <View style={[styles.cabecera, { paddingTop: insets.top + space[5] }]}>
          <Text type="overline" color="onBrandMuted">
            Control Bines
          </Text>
          <Text type="titleSm" color="onBrand">
            {sesion?.nombre ?? ''}
          </Text>
          <Text type="bodySm" color="onBrandMuted">
            {[sesion?.planta.nombre, sesion?.planta.rol].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + space[4] }]}>
          {/* Como en el diseño: Guías de remisión, Exportación y Consultas. */}
          {inicio.secciones.map(seccion => (
            <View key={seccion.modulo}>
              {seccion.pares.map(par => (
                <View key={par.titulo}>
                  {titulo(par.titulo)}
                  {par.accesos.map(acceso => entrada(acceso, acceso.titulo, acceso.direccion === 'ingreso' ? 'log-in' : 'log-out'))}
                </View>
              ))}
              {seccion.accesos.length ? titulo(seccion.modulo === 'Salidas' ? 'Exportación' : seccion.modulo) : null}
              {seccion.accesos.map(acceso => entrada(acceso, acceso.titulo, iconoOpcion(acceso.opcion.id)))}
            </View>
          ))}
          {inicio.otras.length ? (
            <View>
              {titulo('Otras opciones')}
              {inicio.otras.map(acceso => entrada(acceso, acceso.titulo, 'file-text'))}
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
