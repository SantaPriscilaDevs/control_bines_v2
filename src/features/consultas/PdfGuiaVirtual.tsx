import React from 'react';
import { FlatList, Image, PixelRatio, useWindowDimensions, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Banner, Button, Header, HeaderButton, Screen, Text } from '@/components/ui';
import { mensajeDe } from '@/lib/api';
import type { PantallaProps } from '@/navigation/tipos';
import { space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { pdfGuiaVirtual } from './servicio';
import { VisorPdf, type PaginaPdf } from './visorPdf';

const useStyles = makeStyles(color => ({
  lista: { gap: space[3], paddingBottom: space[4] },
  // La hoja sigue blanca en tema oscuro.
  hoja: { backgroundColor: color.paper, borderRadius: 4 },
}));

/** El PDF de la guía virtual a pantalla completa, con el número de guía en la cabecera. */
export default function PdfGuiaVirtual({ route, navigation }: PantallaProps<'PdfGuiaVirtual'>) {
  const styles = useStyles();
  const { codigo } = route.params;
  const { width } = useWindowDimensions();
  const ancho = width - space[4] * 2;
  const paginas = useQuery({
    queryKey: ['pdfGuiaVirtual', codigo],
    queryFn: async (): Promise<PaginaPdf[]> => {
      if (!VisorPdf) throw new Error('El visor de PDF todavía no está disponible en esta versión.');
      const base64 = await pdfGuiaVirtual(codigo);
      return VisorPdf.renderizar(base64, Math.round(ancho * PixelRatio.get()));
    },
    retry: false,
    staleTime: Infinity,
  });
  const total = paginas.data?.length ?? 0;

  return (
    <Screen
      scrollable={false}
      header={
        <Header
          title={codigo}
          overline="Guía virtual"
          navigation={<HeaderButton icon="chevron-left" accessibilityLabel="Volver" onPress={() => navigation.goBack()} />}
        >
          {total ? (
            <Text type="bodySm" color="onBrandMuted">
              {total === 1 ? '1 página' : `${total} páginas`}
            </Text>
          ) : null}
        </Header>
      }
    >
      {paginas.isPending ? <Banner tone="info" message="Bajando el PDF de la guía…" /> : null}
      {paginas.isError ? (
        <View style={{ gap: space[3] }}>
          <Banner tone="danger" message={mensajeDe(paginas.error, 'No se pudo bajar el PDF de la guía. Comuníquese con Sistemas.')} />
          <Button label="Reintentar" variant="secondary" icon="refresh-cw" onPress={() => paginas.refetch()} />
        </View>
      ) : null}
      {paginas.data ? (
        <FlatList
          data={paginas.data}
          keyExtractor={p => p.uri}
          contentContainerStyle={styles.lista}
          renderItem={({ item, index }) => (
            <Image
              source={{ uri: item.uri }}
              style={[styles.hoja, { width: ancho, height: (ancho * item.alto) / item.ancho }]}
              resizeMode="contain"
              accessibilityLabel={`Página ${index + 1} de ${total}`}
            />
          )}
        />
      ) : null}
    </Screen>
  );
}
