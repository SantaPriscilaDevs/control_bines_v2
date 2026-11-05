import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SnackbarHost } from '@/components/ui';
import { conectarQueryClient, queryClient } from '@/lib/queryClient';
import { escucharRed } from '@/lib/red';
import Navegacion from '@/navigation';
import { iniciarSincronizacion } from '@/features/pendientes/sincronizacion';

escucharRed();
conectarQueryClient();

/** Proveedores de la app: área segura, consultas y navegación. El tema se lee de las preferencias. */
export default function App() {
  // Lo pendiente se envía con la app abierta, no con una pantalla en particular.
  useEffect(() => {
    iniciarSincronizacion();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {/* La cabecera es navy en los dos temas: los íconos de la barra de estado van en blanco. */}
        <StatusBar style="light" />
        <Navegacion />
        <SnackbarHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
