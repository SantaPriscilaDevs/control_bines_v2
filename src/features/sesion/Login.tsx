import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Banner, Button, Header, Screen, StatusChip, Text, TextField } from '@/components/ui';
import { config } from '@/config';
import { mensajeLogin } from './mensajes';
import { iniciarSesion } from './sesion';

/** Inicio de sesión con el mismo correo y contraseña de hoy: el login no cambia en el backend. */
export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const ingreso = useMutation({ mutationFn: () => iniciarSesion(correo, contrasena) });
  const puedeEnviar = correo.trim() !== '' && contrasena !== '' && !ingreso.isPending;
  const ingresar = () => {
    if (puedeEnviar) ingreso.mutate();
  };
  // Al escribir se borra el error anterior.
  const cambiar = (set: (v: string) => void) => (valor: string) => {
    set(valor);
    if (ingreso.isError) ingreso.reset();
  };

  return (
    <Screen
      header={
        <Header title="Inicia sesión" overline="Control Bines" large actions={config.esDesarrollo ? <StatusChip text="DEV" tone="warning" /> : null}>
          <Text type="bodySm" color="onBrandMuted">
            Ingrese con su correo y contraseña.
          </Text>
        </Header>
      }
      footer={<Button label={ingreso.isPending ? 'Ingresando…' : 'Ingresar'} icon="log-in" onPress={ingresar} disabled={!puedeEnviar} />}
    >
      <TextField
        label="Correo"
        value={correo}
        onChangeText={cambiar(setCorreo)}
        placeholder="nombre@empresa.com"
        leadingIcon="mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="next"
        editable={!ingreso.isPending}
      />
      <TextField
        label="Contraseña"
        value={contrasena}
        onChangeText={cambiar(setContrasena)}
        leadingIcon="lock"
        password
        autoCapitalize="none"
        autoComplete="password"
        returnKeyType="done"
        onSubmitEditing={ingresar}
        editable={!ingreso.isPending}
      />
      {ingreso.isError ? <Banner tone="danger" title="No se pudo iniciar sesión." message={mensajeLogin(ingreso.error)} /> : null}
      {/* La versión y el servidor solo sirven para no confundir la de desarrollo con la de producción. */}
      {config.esDesarrollo ? (
        <Text type="caption" color="textMuted" align="center">
          {`Versión ${config.version} · ${config.variante} · ${config.servidor}`}
        </Text>
      ) : null}
    </Screen>
  );
}
