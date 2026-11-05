import React from 'react';
import { View } from 'react-native';
import { Conexion, Header, HeaderButton, PastillaCabecera } from '@/components/ui';
import { useEnLinea } from '@/lib/red';
import { space } from '@/styles/theme';
import { usePendientes } from '@/features/pendientes/sincronizacion';
import { usePlantaActiva } from '@/features/sesion/sesion';

/** Cabecera de Inicio e Historial: menú, saludo, planta y rol, y la conexión con lo que falta enviar. */
export default function CabeceraPrincipal({ titulo, alAbrirMenu }: { titulo: string; alAbrirMenu: (() => void) | null }) {
  const sesion = usePlantaActiva();
  const enLinea = useEnLinea();
  const pendientes = usePendientes();
  const lugar = [sesion?.planta.nombre, sesion?.planta.rol].filter(Boolean).join(' · ');
  return (
    <Header
      title={titulo}
      overline="Control Bines"
      large
      navigation={alAbrirMenu ? <HeaderButton icon="menu" accessibilityLabel="Abrir menú" onPress={alAbrirMenu} /> : null}
    >
      {/* Con letra grande, la conexión pasa abajo y la planta con el rol no se corta. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {lugar ? <PastillaCabecera texto={lugar} /> : null}
        <Conexion enLinea={enLinea} pendientes={pendientes.total} pastilla />
      </View>
    </Header>
  );
}
