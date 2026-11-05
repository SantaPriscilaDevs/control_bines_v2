import React from 'react';
import { View } from 'react-native';
import { StatusChip, Text } from '@/components/ui';
import { space } from '@/styles/theme';
import { evento, nombreEvento } from './catalogo';
import type { Disparo, EstadoDisparo } from './disparos';
import { horaDe } from './reglas';

/** Estado de un registro: ENVIADO, PENDIENTE o RECHAZADO. */
export function ChipDisparo({ estado }: { estado: EstadoDisparo }) {
  if (estado === 'Enviado') return <StatusChip text="Enviado" tone="success" />;
  if (estado === 'Pendiente') return <StatusChip text="Pendiente" tone="warning" />;
  return <StatusChip text="Rechazado" tone="danger" />;
}

/**
 * Un registro con su hora, su guía, de dónde es y lo que respondió el ERP. Con [conEvento] dice
 * además qué evento fue (en el Historial, donde se mezclan).
 */
export function FilaDisparo({ disparo, conEvento = false }: { disparo: Disparo; conEvento?: boolean }) {
  const ev = evento(disparo.idEvento);
  const detalle = [conEvento ? (ev ? nombreEvento(ev) : disparo.observaciones) : null, disparo.nombreCamaronera]
    .filter(Boolean)
    .join(' · ');
  const pendienteSinDetalle = disparo.estado === 'Pendiente' && !detalle ? 'Se enviará al volver la conexión' : null;
  return (
    <View style={{ flexDirection: 'row', gap: space[3], paddingHorizontal: 14, paddingVertical: space[3] }}>
      <Text type="monoSm" style={{ width: 46, paddingTop: 2 }}>
        {horaDe(disparo.fechaHora)}
      </Text>
      <View style={{ flex: 1 }}>
        <Text type="mono">{disparo.guia}</Text>
        {detalle || pendienteSinDetalle ? (
          <Text type="bodySm" color="textMuted">
            {detalle || pendienteSinDetalle}
          </Text>
        ) : null}
        {disparo.estado === 'Rechazado' && disparo.mensaje ? (
          <Text type="bodySm" color="danger">
            {disparo.mensaje}
          </Text>
        ) : null}
      </View>
      <ChipDisparo estado={disparo.estado} />
    </View>
  );
}
