import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@/styles/useTheme';
import Captura from '@/features/eventos/Captura';
import Exportacion from '@/features/exportacion/Exportacion';
import GuiasVirtuales from '@/features/consultas/GuiasVirtuales';
import PdfGuiaVirtual from '@/features/consultas/PdfGuiaVirtual';
import ValidarPersonal from '@/features/consultas/ValidarPersonal';
import Principal from '@/features/inicio/Principal';
import LecturaGuia from '@/features/remision/LecturaGuia';
import Remision from '@/features/remision/Remision';
import Login from '@/features/sesion/Login';
import Planta from '@/features/sesion/Planta';
import { useSesion } from '@/features/sesion/sesion';
import type { RootStackParamList } from './tipos';

const Stack = createNativeStackNavigator<RootStackParamList>();

function CambiarPlanta() {
  return <Planta cambiando />;
}

/**
 * Las pantallas dependen de la sesión: sin sesión, el inicio de sesión; sin planta, elegirla; con
 * las dos, el Inicio y lo demás. Al cerrar sesión, React Navigation vuelve solo al inicio de sesión.
 */
export default function Navegacion() {
  const sesion = useSesion(s => s.estado.tipo);
  const { color, isDark } = useTheme();
  const tema: Theme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: color.primary,
      background: color.bg,
      card: color.brand,
      text: color.text,
      border: color.border,
      notification: color.danger,
    },
  };
  return (
    <NavigationContainer theme={tema}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {sesion === 'sinSesion' ? <Stack.Screen name="Login" component={Login} /> : null}
        {sesion === 'sinPlanta' ? <Stack.Screen name="Planta" component={Planta} /> : null}
        {sesion === 'activa' ? (
          <Stack.Group>
            <Stack.Screen name="Principal" component={Principal} />
            <Stack.Screen name="CambiarPlanta" component={CambiarPlanta} />
            <Stack.Screen name="Captura" component={Captura} />
            <Stack.Screen name="Remision" component={Remision} />
            <Stack.Screen name="LecturaGuia" component={LecturaGuia} />
            <Stack.Screen name="Exportacion" component={Exportacion} />
            <Stack.Screen name="ValidarPersonal" component={ValidarPersonal} />
            <Stack.Screen name="GuiasVirtuales" component={GuiasVirtuales} />
            <Stack.Screen name="PdfGuiaVirtual" component={PdfGuiaVirtual} />
          </Stack.Group>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
