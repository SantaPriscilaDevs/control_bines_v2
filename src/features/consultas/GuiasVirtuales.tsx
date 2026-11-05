import React, { useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Banner, Button, Card, Dato, Datos, Header, HeaderButton, Icon, ScanPrompt, Screen, StatusChip, Text, TextField, type Tono } from '@/components/ui';
import { lectorCodigos } from '@/hardware';
import { useGatillo } from '@/hardware/useGatillo';
import { mensajeDe } from '@/lib/api';
import type { PantallaProps } from '@/navigation/tipos';
import { space } from '@/styles/theme';
import { usePlantaActiva } from '@/features/sesion/sesion';
import { esGuiaVirtual, recibirGuiaVirtual, type GuiaVirtual } from './servicio';

/**
 * Recepción de guías virtuales: leer el QR registra que la guía llegó a la planta. Se lee la
 * siguiente con el gatillo sin volver atrás.
 */
export default function GuiasVirtuales({ navigation }: PantallaProps<'GuiasVirtuales'>) {
  const sesion = usePlantaActiva();
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<{ tono: Tono; texto: string } | null>(null);
  const [guia, setGuia] = useState<GuiaVirtual | null>(null);

  const recepcion = useMutation({
    mutationFn: (codigo: string) => recibirGuiaVirtual(codigo, sesion?.planta.id ?? ''),
    onMutate: () => {
      setAviso(null);
      setGuia(null);
    },
    onSuccess: (encontrada, codigo) => {
      if (!encontrada) {
        setAviso({ tono: 'warning', texto: `No existe la guía virtual ${codigo}.` });
        return;
      }
      setGuia(encontrada);
      setTexto('');
      setAviso({ tono: 'success', texto: `Recibió la guía en ${sesion?.planta.nombre ?? 'esta planta'}. Quedó registrada su llegada.` });
    },
    onError: error => setAviso({ tono: 'danger', texto: mensajeDe(error, 'No se pudo consultar la guía. Comuníquese con Sistemas.') }),
  });

  const recibir = (leido: string) => {
    const codigo = leido.trim();
    if (!esGuiaVirtual(codigo)) {
      setAviso({ tono: 'danger', texto: 'El código leído no es de una guía virtual.' });
      return;
    }
    recepcion.mutate(codigo);
  };

  useGatillo(async () => {
    if (recepcion.isPending) return;
    const lectura = await lectorCodigos.leer();
    if (lectura.tipo === 'leido') recibir(lectura.texto);
    else if (lectura.tipo === 'noDisponible') setAviso({ tono: 'danger', texto: lectura.motivo });
  });

  let titulo = 'Escanee la guía virtual';
  if (recepcion.isPending) titulo = 'Consultando…';
  else if (guia) titulo = 'Listo para la siguiente';

  return (
    <Screen
      header={
        <Header
          title="Guías virtuales"
          overline="Consultas"
          navigation={<HeaderButton icon="chevron-left" accessibilityLabel="Volver" onPress={() => navigation.goBack()} />}
        />
      }
      footer={guia ? <Button label="Ver guía en PDF" icon="file-text" onPress={() => navigation.navigate('PdfGuiaVirtual', { codigo: guia.codigo })} /> : null}
    >
      {aviso ? <Banner tone={aviso.tono} message={aviso.texto} /> : null}
      {guia ? <DatosGuia guia={guia} /> : null}
      <ScanPrompt title={titulo} message="Presione el gatillo frente al código QR de la guía." icon="scan-barcode" compact={!!guia} />
      {escribiendo ? (
        <>
          <TextField
            label="Número de guía virtual"
            value={texto}
            onChangeText={v => setTexto(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            editable={!recepcion.isPending}
            returnKeyType="search"
            onSubmitEditing={() => texto && recibir(texto)}
          />
          <Button
            label={recepcion.isPending ? 'Consultando…' : 'Consultar'}
            variant="secondary"
            icon="search"
            onPress={() => recibir(texto)}
            disabled={recepcion.isPending || !texto}
          />
        </>
      ) : (
        <Button label="Escribir número" variant="secondary" icon="keyboard" onPress={() => setEscribiendo(true)} />
      )}
    </Screen>
  );
}

/** Origen y destino se leen como una ruta. */
function DatosGuia({ guia }: { guia: GuiaVirtual }) {
  return (
    <Card padding={3} gap={3}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Text type="numMd" style={{ flex: 1 }}>
          {guia.codigo}
        </Text>
        {guia.estado ? <StatusChip text={guia.estado} tone="info" /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Dato rotulo="Sale de" valor={guia.origen} enFila />
        <Icon name="arrow-right" size={20} color="primary" accessibilityLabel="hacia" />
        <Dato rotulo="Llega a" valor={guia.destino} enFila />
      </View>
      <Datos>
        <Dato rotulo="Placa" valor={guia.placa} mono enFila />
        <Dato rotulo="Plataforma" valor={guia.plataforma} mono enFila />
      </Datos>
      <Dato rotulo="Empresa" valor={guia.empresa} />
    </Card>
  );
}
