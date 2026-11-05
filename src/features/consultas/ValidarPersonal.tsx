import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import {
  Banner,
  Button,
  Card,
  Dato,
  Datos,
  Divider,
  Header,
  HeaderButton,
  Icon,
  IconTile,
  ListRow,
  ScanPrompt,
  Screen,
  StatusChip,
  Text,
  TextField,
  type Tono,
} from '@/components/ui';
import { useLectorCodigos } from '@/hardware/useLectorCodigos';
import { esErrorApi, mensajeDe, tokenActual, urlDe } from '@/lib/api';
import type { PantallaProps } from '@/navigation/tipos';
import { radius, space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { cedulaDelQr, persona as consultarPersona, rutaFoto, type Persona } from './servicio';

const useStyles = makeStyles(color => ({
  encabezado: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  nombre: { flex: 1, gap: 10 },
  foto: { width: 72, height: 72, borderRadius: 16, backgroundColor: color.surfaceContainer, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagen: { width: 72, height: 72, borderRadius: radius.overlay },
}));

/** Validar personal con el QR del carné o la cédula escrita. La siguiente lectura reemplaza a la anterior. */
export default function ValidarPersonal({ navigation }: PantallaProps<'ValidarPersonal'>) {
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<{ tono: Tono; texto: string } | null>(null);
  const consulta = useMutation({
    mutationFn: consultarPersona,
    onMutate: () => setAviso(null),
    onSuccess: () => setTexto(''),
    onError: error => {
      // «Cédula … no registrada» llega con 400.
      if (esErrorApi(error) && error.tipo === 'http' && error.codigo! < 500 && error.mensajeServidor) {
        setAviso({ tono: 'warning', texto: error.mensajeServidor });
      } else {
        setAviso({ tono: 'danger', texto: mensajeDe(error, 'No se pudo consultar la cédula. Comuníquese con Sistemas.') });
      }
    },
  });

  useLectorCodigos({
    alLeer: texto => {
      const cedula = cedulaDelQr(texto);
      if (cedula) consulta.mutate(cedula);
      else setAviso({ tono: 'danger', texto: 'No se encontró una cédula en el código leído.' });
    },
    alFallar: motivo => setAviso({ tono: 'danger', texto: motivo }),
    puedeLeer: () => !consulta.isPending,
  });

  const consultarEscrita = () => {
    if (!texto.trim()) {
      setAviso({ tono: 'warning', texto: 'Escriba la cédula.' });
      return;
    }
    consulta.mutate(texto);
  };

  const persona = consulta.isSuccess ? consulta.data : null;
  let titulo = 'Escanee el carné';
  if (consulta.isPending) titulo = 'Consultando…';
  else if (persona) titulo = 'Listo para la siguiente';

  return (
    <Screen
      header={
        <Header
          title="Validar personal"
          overline="Consultas"
          navigation={<HeaderButton icon="chevron-left" accessibilityLabel="Volver" onPress={() => navigation.goBack()} />}
        />
      }
    >
      {persona ? <ResultadoPersona persona={persona} /> : null}
      <ScanPrompt title={titulo} message="Presione el gatillo frente al código QR de la cédula." icon="scan-barcode" compact={!!persona || !!aviso} />
      {aviso ? <Banner tone={aviso.tono} message={aviso.texto} /> : null}
      {escribiendo ? (
        <>
          <TextField
            label="Cédula"
            value={texto}
            onChangeText={v => setTexto(v.replace(/\D/g, '').slice(0, 13))}
            placeholder="Ej. 0912345678"
            keyboardType="number-pad"
            editable={!consulta.isPending}
            returnKeyType="search"
            onSubmitEditing={consultarEscrita}
          />
          <Button label={consulta.isPending ? 'Consultando…' : 'Consultar'} icon="search" onPress={consultarEscrita} disabled={consulta.isPending || !texto} />
        </>
      ) : (
        <Button label="Escribir cédula" variant="secondary" icon="keyboard" onPress={() => setEscribiendo(true)} />
      )}
    </Screen>
  );
}

/**
 * El resultado se ve a distancia: ACTIVO o INACTIVO es lo que se decide en la garita, así que va
 * como título. Celular y permiso de salida, cada uno con su estado escrito.
 */
function ResultadoPersona({ persona }: { persona: Persona }) {
  const styles = useStyles();
  const autorizado = persona.permiso.find(p => p.autorizado)?.autorizado ?? null;
  let permiso: string;
  if (persona.permiso.length === 0) permiso = 'No tiene permiso registrado hoy';
  else if (autorizado) permiso = `Salida autorizada a las ${autorizado.slice(0, 5)}`;
  else {
    permiso = persona.permiso
      .map(r => [r.aprobado ? 'Aprobado' : 'No aprobado', r.usuario ? `por ${r.usuario}` : null, r.hora ? `a las ${r.hora.slice(0, 5)}` : null].filter(Boolean).join(' '))
      .join(' · ');
  }
  let chipPermiso: React.ReactNode;
  if (persona.permiso.length === 0) chipPermiso = <StatusChip text="Sin permiso" tone="neutral" />;
  else if (autorizado) chipPermiso = <StatusChip text="Autorizado" tone="success" />;
  else if (persona.permiso.some(p => p.aprobado)) chipPermiso = <StatusChip text="Aprobado" tone="info" />;
  else chipPermiso = <StatusChip text="No aprobado" tone="danger" />;

  return (
    <>
      <Card padding={3} gap={3}>
        <View style={styles.encabezado}>
          <View style={styles.nombre}>
            {persona.activo ? (
              <StatusChip text="Activo" tone="success" icon="user-check" large />
            ) : (
              <StatusChip text="Inactivo" tone="danger" icon="triangle-alert" large />
            )}
            <Text type="titleMd">{persona.nombre}</Text>
          </View>
          <Foto cedula={persona.cedula} />
        </View>
        {persona.estado ? (
          <Text type="bodySm" color="textMuted">
            {persona.estado}
          </Text>
        ) : null}
        <Divider />
        <Datos>
          <Dato rotulo="Cédula" valor={persona.cedula} mono enFila />
          <Dato rotulo="Sección" valor={persona.seccion} enFila />
        </Datos>
        <Dato rotulo="Cargo" valor={persona.cargo} />
      </Card>
      <Card padding={0}>
        {persona.celular ? (
          <>
            <ListRow
              headline="Celular"
              supporting={persona.celular}
              leading={<IconTile icon="smartphone" />}
              trailing={persona.puedeIngresarCelular ? <StatusChip text="Puede ingresar" tone="success" /> : <StatusChip text="No puede ingresar" tone="danger" />}
            />
            <Divider />
          </>
        ) : null}
        <ListRow headline="Permiso de salida" supporting={permiso} leading={<IconTile icon="log-out" />} trailing={chipPermiso} />
      </Card>
    </>
  );
}

/** La foto del colaborador; el ERP responde 400 si no tiene y queda el ícono. */
function Foto({ cedula }: { cedula: string }) {
  const styles = useStyles();
  const [sinFoto, setSinFoto] = useState(false);
  const token = tokenActual();
  return (
    <View style={styles.foto}>
      {sinFoto ? (
        <Icon name="user" size={32} color="textMuted" />
      ) : (
        <Image
          source={{ uri: urlDe(rutaFoto(cedula)), headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
          style={styles.imagen}
          resizeMode="cover"
          onError={() => setSinFoto(true)}
          accessibilityLabel="Foto del colaborador"
        />
      )}
    </View>
  );
}
