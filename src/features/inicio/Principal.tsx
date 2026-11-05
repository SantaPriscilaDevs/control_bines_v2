import React, { useCallback, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomBar, confirmar, type BottomBarItem } from '@/components/ui';
import { useEnLinea } from '@/lib/red';
import type { PantallaProps } from '@/navigation/tipos';
import { destinoDe } from '@/navigation/rutas';
import { useDisparosDeHoy, usePendientes } from '@/features/pendientes/sincronizacion';
import type { OpcionMenu } from '@/features/sesion/menu';
import { usePlantaActiva } from '@/features/sesion/sesion';
import { armarInicio, conMenu, primerNombre } from './armado';
import CabeceraPrincipal from './CabeceraPrincipal';
import Historial from './Historial';
import Inicio from './Inicio';
import MenuLateral from './MenuLateral';
import Perfil from './Perfil';

type Pestana = 'inicio' | 'historial' | 'perfil';

const PESTANAS: BottomBarItem<Pestana>[] = [
  { key: 'inicio', label: 'Inicio', icon: 'house' },
  { key: 'historial', label: 'Historial', icon: 'history' },
  { key: 'perfil', label: 'Perfil', icon: 'user' },
];

/**
 * Las pantallas principales con la barra de abajo (Inicio, Historial y Perfil) y el menú lateral,
 * que tiene todo lo que no es registrar eventos.
 */
export default function Principal({ navigation }: PantallaProps<'Principal'>) {
  const [pestana, setPestana] = useState<Pestana>('inicio');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const sesion = usePlantaActiva();
  const enLinea = useEnLinea();
  const pendientes = usePendientes();
  const disparos = useDisparosDeHoy();
  const inicio = useMemo(() => armarInicio(sesion?.opciones ?? [], enLinea), [sesion?.opciones, enLinea]);
  const abrirMenu = conMenu(inicio) ? () => setMenuAbierto(true) : null;

  const abrir = useCallback(
    (opcion: OpcionMenu) => {
      setMenuAbierto(false);
      const destino = destinoDe(opcion.id);
      if (!destino) {
        confirmar('Esta opción todavía no está disponible en esta aplicación. Comuníquese con Sistemas.');
        return;
      }
      // `destinoDe` ya garantiza que cada pantalla reciba sus parámetros.
      const [ruta, parametros] = destino;
      (navigation.navigate as (ruta: string, parametros?: object) => void)(ruta, parametros);
    },
    [navigation],
  );

  // Atrás vuelve al Inicio antes de salir de la app.
  useFocusEffect(
    useCallback(() => {
      const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
        if (pestana === 'inicio') return false;
        setPestana('inicio');
        return true;
      });
      return () => suscripcion.remove();
    }, [pestana]),
  );

  const barra = <BottomBar items={PESTANAS} selected={pestana} onSelect={setPestana} />;
  let contenido: React.ReactNode;
  if (pestana === 'historial') {
    contenido = <Historial disparos={disparos} pendientes={pendientes} cabecera={<CabeceraPrincipal titulo="Historial" alAbrirMenu={abrirMenu} />} barra={barra} />;
  } else if (pestana === 'perfil') {
    contenido = <Perfil pendientes={pendientes} barra={barra} alAbrirMenu={abrirMenu} />;
  } else {
    contenido = (
      <Inicio
        inicio={inicio}
        disparos={disparos}
        porEnviar={pendientes.disparos}
        cabecera={<CabeceraPrincipal titulo={`Hola, ${primerNombre(sesion?.nombre ?? '')}`} alAbrirMenu={abrirMenu} />}
        barra={barra}
        alAbrir={abrir}
        alAbrirMenu={abrirMenu}
      />
    );
  }

  return (
    <>
      {contenido}
      <MenuLateral visible={menuAbierto} inicio={inicio} alCerrar={() => setMenuAbierto(false)} alAbrir={abrir} />
    </>
  );
}
