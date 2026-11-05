import React from 'react';
import { BackHandler, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Banner, Button, Card, Divider, Header, HeaderButton, Screen, SectionTitle, SegmentedControl, Text } from '@/components/ui';
import { config } from '@/config';
import { usePreferencias, type TamanoLetra, type Tema } from '@/lib/storage/preferencias';
import { space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import type { ConteoPendientes } from '@/features/pendientes/sincronizacion';
import { cerrarSesion, usePlantaActiva } from '@/features/sesion/sesion';
import { iniciales } from './armado';

const useStyles = makeStyles(color => ({
  persona: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.primaryBg, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1 },
  dato: { flexDirection: 'row', alignItems: 'center', paddingStart: 14, paddingEnd: space[2], minHeight: 56 },
  ajuste: { gap: space[2] },
}));

/** Quién es, dónde está, la apariencia y cambiar de usuario: los equipos se comparten. */
export default function Perfil({ pendientes, barra, alAbrirMenu }: { pendientes: ConteoPendientes; barra: React.ReactNode; alAbrirMenu: (() => void) | null }) {
  const styles = useStyles();
  const navigation = useNavigation();
  const sesion = usePlantaActiva();
  const { tema, letra, cambiarTema, cambiarLetra } = usePreferencias();
  const nombre = sesion?.nombre ?? '';

  return (
    <Screen
      bottomBar={barra}
      header={
        <Header
          title="Perfil"
          overline="Control Bines"
          navigation={alAbrirMenu ? <HeaderButton icon="menu" accessibilityLabel="Abrir menú" onPress={alAbrirMenu} /> : null}
        >
          <View style={styles.persona}>
            <View style={styles.avatar}>
              <Text type="titleSm" color="brand">
                {iniciales(nombre)}
              </Text>
            </View>
            <View style={styles.textos}>
              <Text type="titleSm" color="onBrand">
                {nombre}
              </Text>
              {sesion?.correo ? (
                <Text type="bodySm" color="onBrandMuted">
                  {sesion.correo}
                </Text>
              ) : null}
            </View>
          </View>
        </Header>
      }
    >
      <Card padding={0}>
        <Dato rotulo="Planta" valor={sesion?.planta.nombre} accion={<Button label="Cambiar" variant="secondary" size="md" onPress={() => navigation.navigate('CambiarPlanta')} />} />
        <Divider />
        <Dato rotulo="Rol" valor={sesion?.planta.rol} />
        <Divider />
        <Dato rotulo="Versión" valor={`${config.version} · ${config.esDesarrollo ? 'dev' : 'producción'}`} />
      </Card>
      <SectionTitle text="Apariencia" />
      <Card padding={4} gap={4}>
        <View style={styles.ajuste}>
          <View>
            <Text type="bodyStrong">Tema</Text>
            <Text type="caption" color="textMuted">
              Sistema sigue el ajuste del teléfono.
            </Text>
          </View>
          <SegmentedControl<Tema>
            accessibilityLabel="Tema"
            value={tema}
            onChange={cambiarTema}
            options={[
              { value: 'claro', label: 'Claro' },
              { value: 'oscuro', label: 'Oscuro' },
              { value: 'sistema', label: 'Sistema' },
            ]}
          />
        </View>
        <View style={styles.ajuste}>
          <View>
            <Text type="bodyStrong">Tamaño de letra</Text>
            <Text type="caption" color="textMuted">
              Sistema sigue al teléfono, hasta un 30 % más grande.
            </Text>
          </View>
          <SegmentedControl<TamanoLetra>
            accessibilityLabel="Tamaño de letra"
            value={letra}
            onChange={cambiarLetra}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'grande', label: 'Grande' },
              { value: 'sistema', label: 'Sistema' },
            ]}
          />
        </View>
      </Card>
      {pendientes.total > 0 ? (
        <Banner
          tone="warning"
          icon="refresh-cw"
          title={`${pendientes.total} por enviar.`}
          message="Se envían solos al volver la conexión, aunque cambie el usuario."
        />
      ) : null}
      <Button label="Cambiar de usuario" variant="secondary" icon="users" onPress={cerrarSesion} />
      <Button
        label="Cerrar sesión y salir"
        variant="danger"
        icon="log-out"
        onPress={() => {
          cerrarSesion();
          BackHandler.exitApp();
        }}
      />
    </Screen>
  );
}

function Dato({ rotulo, valor, accion }: { rotulo: string; valor: string | null | undefined; accion?: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.dato}>
      <View style={[styles.textos, { paddingVertical: space[3] }]}>
        <Text type="label" color="textMuted">
          {rotulo}
        </Text>
        <Text type="bodyStrong">{valor?.trim() || '—'}</Text>
      </View>
      {accion}
    </View>
  );
}
