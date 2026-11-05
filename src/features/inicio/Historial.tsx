import React from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, Divider, IconTile, ListRow, Screen, SectionTitle, StatusChip, Text, type IconName } from '@/components/ui';
import { useEnLinea } from '@/lib/red';
import type { Disparo } from '@/features/eventos/disparos';
import { FilaDisparo } from '@/features/eventos/FilaDisparo';
import { enviarAhora, type ConteoPendientes } from '@/features/pendientes/sincronizacion';

const MAXIMO = 100;

/** Lo que está guardado en el equipo sin llegar al ERP y lo registrado hoy en este equipo. */
export default function Historial({
  disparos,
  pendientes,
  cabecera,
  barra,
}: {
  disparos: Disparo[];
  pendientes: ConteoPendientes;
  cabecera: React.ReactNode;
  barra: React.ReactNode;
}) {
  const enLinea = useEnLinea();
  const rechazados = disparos.filter(d => d.estado === 'Rechazado').length;
  // Lo rechazado va primero, con el motivo.
  const ordenados = [...disparos].sort((a, b) => Number(b.estado === 'Rechazado') - Number(a.estado === 'Rechazado'));
  let resumen = disparos.length === 1 ? '1 registro' : `${disparos.length} registros`;
  if (rechazados > 0) resumen += rechazados === 1 ? ' · 1 rechazado' : ` · ${rechazados} rechazados`;

  return (
    <Screen header={cabecera} bottomBar={barra}>
      <SectionTitle text="Por enviar" aside={pendientes.total === 0 ? 'nada pendiente' : `${pendientes.total} en total`} />
      <Card padding={0}>
        <FilaPendiente titulo="Disparos" detalle="Registrados sin conexión" cantidad={pendientes.disparos} icono="scan-barcode" />
        <Divider />
        <FilaPendiente titulo="Movimientos de bines" detalle="Guías de remisión leídas sin conexión" cantidad={pendientes.movimientosBines} icono="package" />
      </Card>
      {pendientes.total > 0 && enLinea ? <Button label="Enviar ahora" variant="secondary" icon="refresh-cw" onPress={enviarAhora} /> : null}
      <Banner
        tone={enLinea ? 'primary' : 'warning'}
        message={
          enLinea
            ? 'Los pendientes se envían solos mientras haya conexión.'
            : 'Sin conexión: los pendientes se enviarán solos cuando vuelva la red.'
        }
      />
      <SectionTitle text="Hoy" aside={resumen} />
      {disparos.length === 0 ? (
        <Text type="bodySm" color="textMuted">
          Todavía no se registran eventos hoy en este equipo. Aparecerán aquí apenas registre el primero.
        </Text>
      ) : (
        <Card padding={0}>
          {ordenados.slice(0, MAXIMO).map((d, i) => (
            <View key={d.id}>
              {i > 0 ? <Divider /> : null}
              <FilaDisparo disparo={d} conEvento />
            </View>
          ))}
          {disparos.length > MAXIMO ? (
            <Text type="bodySm" color="textMuted" style={{ padding: 14 }}>
              {`y ${disparos.length - MAXIMO} más`}
            </Text>
          ) : null}
        </Card>
      )}
    </Screen>
  );
}

function FilaPendiente({ titulo, detalle, cantidad, icono }: { titulo: string; detalle: string; cantidad: number; icono: IconName }) {
  const tono = cantidad > 0 ? 'warning' : 'success';
  return (
    <ListRow
      headline={titulo}
      supporting={detalle}
      leading={<IconTile icon={icono} tone={tono} />}
      trailing={<StatusChip text={cantidad > 0 ? String(cantidad) : 'Al día'} tone={tono} />}
    />
  );
}
