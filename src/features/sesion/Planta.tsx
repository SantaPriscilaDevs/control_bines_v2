import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Banner, Button, Card, Divider, Header, HeaderButton, Screen, SectionTitle, StatusChip, Text } from '@/components/ui';
import { queryKeys } from '@/lib/queryClient';
import { usePreferencias } from '@/lib/storage/preferencias';
import { space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { primerNombre } from '@/features/inicio/armado';
import { mensajePlanta } from './mensajes';
import { cerrarSesion, elegirPlanta, plantasDisponibles, useSesion } from './sesion';

const useStyles = makeStyles(color => ({
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: 14, paddingVertical: space[3], minHeight: 56 },
  presionada: { backgroundColor: color.surfaceContainer },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioElegido: { borderColor: color.primary },
  punto: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.primary },
  nombre: { flex: 1 },
  cargando: { padding: space[6], alignItems: 'center' },
}));

/**
 * Elegir la planta de una lista, sin QR. La última usada aparece primera y ya elegida; si el
 * usuario tiene una sola, el paso se salta. [cambiando]: llega desde Perfil con la sesión activa.
 */
export default function Planta({ cambiando = false }: { cambiando?: boolean }) {
  const styles = useStyles();
  const navigation = useNavigation();
  const nombre = useSesion(s => (s.estado.tipo === 'sinSesion' ? '' : s.estado.nombre));
  const ultima = usePreferencias(s => s.ultimaPlanta);
  const plantas = useQuery({ queryKey: queryKeys.plantas, queryFn: plantasDisponibles });
  const [eleccion, setElegida] = useState<number | null>(null);
  const entrada = useMutation({
    mutationFn: elegirPlanta,
    onSuccess: () => {
      if (cambiando) navigation.goBack();
    },
  });

  const ordenadas = useMemo(() => {
    const lista = plantas.data ?? [];
    const conUltima = ultima != null && lista.some(p => p.id === ultima) ? ultima : null;
    // La última planta usada va primera; el resto, en orden alfabético.
    return { lista: [...lista].sort((a, b) => Number(b.id === conUltima) - Number(a.id === conUltima)), ultima: conUltima };
  }, [plantas.data, ultima]);

  // Queda elegida la última usada, o la única que hay.
  const unica = plantas.data?.length === 1 ? plantas.data[0].id : null;
  const elegida = eleccion ?? ordenadas.ultima ?? unica;

  // Si el usuario tiene una sola planta, el paso se salta.
  const { mutate: entrar } = entrada;
  const autoEntrada = useRef(false);
  useEffect(() => {
    if (unica == null || cambiando || autoEntrada.current) return;
    autoEntrada.current = true;
    entrar(unica);
  }, [unica, cambiando, entrar]);

  const saludo = primerNombre(nombre);
  const falla = plantas.isError ? plantas.error : entrada.isError ? entrada.error : null;
  const error = falla ? mensajePlanta(falla) : null;

  return (
    <Screen
      header={
        <Header
          title="¿Dónde trabajas hoy?"
          overline={saludo ? `Hola, ${saludo}` : 'Control Bines'}
          navigation={cambiando ? <HeaderButton icon="chevron-left" accessibilityLabel="Volver" onPress={() => navigation.goBack()} /> : null}
          actions={cambiando ? null : <HeaderButton icon="log-out" accessibilityLabel="Cerrar sesión" onPress={cerrarSesion} />}
        />
      }
      footer={
        <Button
          label={entrada.isPending ? 'Cargando la planta…' : 'Continuar'}
          icon="arrow-right"
          onPress={() => elegida != null && entrada.mutate(elegida)}
          disabled={elegida == null || entrada.isPending}
        />
      }
    >
      {error ? (
        <Banner
          tone="danger"
          message={error}
          action={plantas.isError ? <Button label="Reintentar" variant="secondary" icon="refresh-cw" onPress={() => plantas.refetch()} /> : null}
        />
      ) : null}
      <SectionTitle text="Plantas" aside={ordenadas.lista.length ? `${ordenadas.lista.length}` : null} />
      {plantas.isPending ? (
        <View style={styles.cargando}>
          <ActivityIndicator size="large" />
        </View>
      ) : ordenadas.lista.length > 0 ? (
        <Card padding={0}>
          <View accessibilityRole="radiogroup">
            {ordenadas.lista.map((planta, i) => {
              const marcada = planta.id === elegida;
              return (
                <View key={planta.id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() => {
                      setElegida(planta.id);
                      if (entrada.isError) entrada.reset();
                    }}
                    disabled={entrada.isPending}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: marcada }}
                    accessibilityLabel={planta.nombre}
                    style={({ pressed }) => [styles.fila, pressed && styles.presionada]}
                  >
                    <View style={[styles.radio, marcada && styles.radioElegido]}>{marcada ? <View style={styles.punto} /> : null}</View>
                    <Text type="bodyStrong" style={styles.nombre}>
                      {planta.nombre}
                    </Text>
                    {planta.id === ordenadas.ultima ? <StatusChip text="Última" tone="info" /> : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
