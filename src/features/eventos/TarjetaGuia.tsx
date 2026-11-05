import React from 'react';
import { View } from 'react-native';
import { Card, Dato, Datos, Divider, StatusChip, Text } from '@/components/ui';
import { space } from '@/styles/theme';
import type { Evento } from './catalogo';
import type { GuiaTrazabilidad } from './disparos';
import { vehiculoPrimero } from './reglas';

/** Un grupo de datos de la guía: una línea lo separa del anterior y lo encabeza su título. */
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <>
      <Divider />
      <View style={{ gap: space[2] }}>
        <Text type="labelStrong" color="primary" accessibilityRole="header">
          {titulo}
        </Text>
        {children}
      </View>
    </>
  );
}

/**
 * La guía leída, con todos sus datos a la vista y por secciones: chofer, vehículo, ruta y datos de
 * pesca. En garita va primero lo que se compara con el camión; en pesca, calidad y recepción, de
 * dónde viene.
 */
export default function TarjetaGuia({ guia, datos, evento, noEncontrada }: { guia: string; datos: GuiaTrazabilidad | null; evento: Evento; noEncontrada: boolean }) {
  if (!datos) {
    return (
      <Card padding={4} gap={3}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text type="label" color="textMuted" style={{ flex: 1 }}>
            Guía leída
          </Text>
          {noEncontrada ? <StatusChip text="No encontrada" tone="danger" /> : <StatusChip text="Sin validar" tone="warning" />}
        </View>
        <Text type="numLg">{guia}</Text>
        <Text type="bodySm" color="textMuted">
          {noEncontrada
            ? 'Si necesita registrar el movimiento de todas formas, puede hacerlo: la guía se validará cuando se envíe el registro.'
            : 'Sin conexión no se puede consultar. Revise el número: si la registra, se enviará cuando vuelva la conexión.'}
        </Text>
      </Card>
    );
  }

  const chofer = (
    <Seccion key="chofer" titulo="Información del chofer">
      <Datos>
        <Dato rotulo="Nombre" valor={datos.conductor} enFila />
        {datos.cedulaConductor ? <Dato rotulo="Cédula" valor={datos.cedulaConductor} mono enFila /> : null}
      </Datos>
    </Seccion>
  );
  const vehiculo = (
    <Seccion key="vehiculo" titulo="Información del vehículo">
      <Datos>
        {datos.descripcionMovil ? <Dato rotulo="Móvil" valor={datos.descripcionMovil} mono enFila /> : null}
        <Dato rotulo="Placa" valor={datos.movil} grande enFila />
      </Datos>
      {/* `co_empresa` de la guía es la empresa de transporte. */}
      <Dato rotulo="Empresa de transporte" valor={datos.empresa} />
    </Seccion>
  );
  const ruta = (
    <Seccion key="ruta" titulo="Ruta">
      <Datos>
        <Dato rotulo="Origen" valor={datos.plantaSalida} enFila />
        <Dato rotulo="Destino" valor={datos.plantaDestino} enFila />
      </Datos>
    </Seccion>
  );
  const pesca = (
    <Seccion key="pesca" titulo="Datos de pesca">
      <Datos>
        <Dato rotulo="Camaronera" valor={datos.camaronera} enFila />
        <Dato rotulo="Piscina" valor={datos.piscina} enFila />
      </Datos>
      <Dato rotulo="Gramaje" valor={datos.gramaje} mono />
    </Seccion>
  );
  const orden = vehiculoPrimero(evento) ? [chofer, vehiculo, ruta, pesca] : [pesca, chofer, vehiculo, ruta];

  return (
    <Card padding={4} gap={3}>
      {/* Sin tipo de guía ni «válida»: si se pudo leer, es una guía válida. */}
      <View>
        <Text type="label" color="textMuted">
          Guía de movilización
        </Text>
        <Text type="numLg">{guia}</Text>
      </View>
      {orden}
    </Card>
  );
}
