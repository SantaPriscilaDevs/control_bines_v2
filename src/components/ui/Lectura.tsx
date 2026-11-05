import React from 'react';
import { Pressable, View } from 'react-native';
import { hit, radius, space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { useTheme } from '@/styles/useTheme';
import Card from './Card';
import Icon, { type IconName } from './Icon';
import Text from './Text';
import { TONOS, type Tono } from './tono';

const useStyles = makeStyles(color => ({
  invitacion: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.borderMuted,
    borderRadius: radius.container,
  },
  grande: { alignItems: 'center', gap: space[3], paddingHorizontal: space[5], paddingVertical: space[6] },
  compacta: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  icono: { backgroundColor: color.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  contadorIcono: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cifra: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2], flexWrap: 'wrap' },
  unidad: { paddingBottom: 6, flexShrink: 1 },
  barra: { height: 8, borderRadius: radius.pill, backgroundColor: color.surfaceContainer, overflow: 'hidden' },
  avance: { height: 8, borderRadius: radius.pill },
  conteos: { flexDirection: 'row', gap: space[2] },
  conteo: { flex: 1, borderRadius: radius.control, paddingHorizontal: 10, paddingVertical: space[2], minHeight: hit.min },
  resaltado: { backgroundColor: color.primarySubtle, borderRadius: radius.control, padding: space[3], gap: space[2] },
}));

/**
 * Invitación a leer con el gatillo. La grande ocupa el centro de una pantalla vacía; la compacta va
 * arriba de un resultado («Listo para la siguiente»).
 */
export function ScanPrompt({ title, message, icon, compact = false }: { title: string; message: string; icon: IconName; compact?: boolean }) {
  const styles = useStyles();
  const caja = compact ? 56 : 96;
  return (
    <View style={[styles.invitacion, compact ? styles.compacta : styles.grande]}>
      <View style={[styles.icono, { width: caja, height: caja, borderRadius: caja / 3.6 }]}>
        <Icon name={icon} size={compact ? 32 : 56} color="primary" />
      </View>
      <View style={compact ? styles.textos : { gap: space[2] }}>
        <Text type={compact ? 'titleSm' : 'titleMd'} align={compact ? undefined : 'center'}>
          {title}
        </Text>
        <Text type={compact ? 'bodySm' : 'body'} color="textMuted" align={compact ? undefined : 'center'}>
          {message}
        </Text>
      </View>
    </View>
  );
}

/**
 * Contador grande de lo leído con RFID, con una ayuda debajo. Con [objetivo] (los bines que pide
 * la guía) muestra el avance en una barra.
 */
export function ContadorLectura({
  cantidad,
  unidad,
  ayuda,
  leyendo,
  objetivo,
}: {
  cantidad: number;
  unidad: string;
  ayuda: string;
  leyendo: boolean;
  objetivo?: number | null;
}) {
  const styles = useStyles();
  const { color } = useTheme();
  const avance = objetivo ? Math.min(1, cantidad / objetivo) : 0;
  return (
    <Card padding={3} gap={3}>
      <View style={styles.contador}>
        <View style={[styles.contadorIcono, { backgroundColor: leyendo ? color.primary : color.primarySubtle }]}>
          <Icon name="radio" size={30} color={leyendo ? 'textOnPrimary' : 'primary'} />
        </View>
        <View style={styles.textos}>
          <View style={styles.cifra}>
            <Text type="numXl">{cantidad}</Text>
            <Text type="bodyStrong" style={styles.unidad}>
              {unidad}
            </Text>
          </View>
          <Text type="bodySm" color="textMuted">
            {leyendo ? 'Leyendo… suelte el gatillo para terminar.' : ayuda}
          </Text>
        </View>
      </View>
      {objetivo ? (
        <View style={styles.barra} accessibilityLabel={`${cantidad} de ${objetivo}`}>
          <View
            style={[styles.avance, { width: `${avance * 100}%`, backgroundColor: cantidad > objetivo ? color.warning : color.primary }]}
          />
        </View>
      ) : null}
    </Card>
  );
}

export interface Conteo {
  cantidad: number;
  etiqueta: string;
  tono: Tono;
}

/** Conteos por estado: número grande sobre el fondo del tono. Tocar uno filtra la lista. */
export function Conteos({ conteos, seleccionado, alSeleccionar }: { conteos: Conteo[]; seleccionado: number | null; alSeleccionar: (i: number | null) => void }) {
  const styles = useStyles();
  const { color } = useTheme();
  return (
    <View style={styles.conteos}>
      {conteos.map((c, i) => {
        const t = TONOS[c.tono];
        const activo = seleccionado === i;
        return (
          <Pressable
            key={c.etiqueta}
            onPress={() => alSeleccionar(activo ? null : i)}
            accessibilityRole="button"
            accessibilityLabel={`${c.etiqueta}: ${c.cantidad}`}
            accessibilityState={{ selected: activo }}
            style={[styles.conteo, { backgroundColor: color[t.fondo] }, activo && { borderWidth: 2, borderColor: color[t.contenido] }]}
          >
            <Text type="numMd" color={t.contenido}>
              {c.cantidad}
            </Text>
            <Text type="captionStrong" color={t.contenido}>
              {c.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Recuadro celeste con lo que se compara con el mundo real (contenedor, placa y conductor contra
 * el camión): va primero y destacado.
 */
export function HighlightBox({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.resaltado}>
      <Text type="label" color="primary">
        {title}
      </Text>
      {children}
    </View>
  );
}
