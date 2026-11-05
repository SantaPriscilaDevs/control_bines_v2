import React from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, Divider, Icon, Screen, SectionTitle, Text, type IconName } from '@/components/ui';
import { space } from '@/styles/theme';
import { direccionDe, evento as eventoPorId, nombreEvento } from '@/features/eventos/catalogo';
import type { Disparo } from '@/features/eventos/disparos';
import { ChipDisparo } from '@/features/eventos/FilaDisparo';
import { horaDe } from '@/features/eventos/reglas';
import type { OpcionMenu } from '@/features/sesion/menu';
import { vacio, type GrupoInicio, type Inicio as DatosInicio } from './armado';
import { fechaLarga, textoRepetir } from './textos';

interface Props {
  inicio: DatosInicio;
  disparos: Disparo[];
  porEnviar: number;
  cabecera: React.ReactNode;
  barra: React.ReactNode;
  alAbrir: (opcion: OpcionMenu) => void;
  alAbrirMenu: (() => void) | null;
}

/** El Inicio es para registrar eventos: los del rol, con lo hecho hoy en este equipo. */
export default function Inicio({ inicio, disparos, porEnviar, cabecera, barra, alAbrir, alAbrirMenu }: Props) {
  return (
    <Screen header={cabecera} bottomBar={barra}>
      {inicio.eventos.length > 0 ? (
        <>
          <HoyEnEsteEquipo disparos={disparos} porEnviar={porEnviar} inicio={inicio} alAbrir={alAbrir} />
          <SectionTitle text="Eventos con guía de movilización" />
          <Card padding={0}>
            {inicio.eventos.map((grupo, i) => (
              <View key={grupo.titulo}>
                {i > 0 ? <Divider /> : null}
                <FilaGrupo grupo={grupo} hoy={disparos.filter(d => grupo.botones.some(b => b.evento.id === d.idEvento)).length} alAbrir={alAbrir} />
              </View>
            ))}
          </Card>
        </>
      ) : alAbrirMenu ? (
        <Banner
          tone="info"
          title="Sus opciones están en el menú."
          message="Ábralo con el botón de arriba a la izquierda."
          action={<Button label="Abrir menú" variant="secondary" icon="menu" onPress={alAbrirMenu} />}
        />
      ) : null}
      {vacio(inicio) ? (
        <Banner tone="warning" title="Sin opciones." message="Su rol no tiene opciones habilitadas en esta planta. Comuníquese con Sistemas." />
      ) : null}
    </Screen>
  );
}

function iconoGrupo(titulo: string): IconName {
  if (titulo.startsWith('Garita')) return 'shield';
  if (titulo.startsWith('Llegada') || titulo.startsWith('Despacho')) return 'truck';
  if (titulo.startsWith('Análisis')) return 'flask';
  return 'map-pin';
}

function FilaGrupo({ grupo, hoy, alAbrir }: { grupo: GrupoInicio; hoy: number; alAbrir: (o: OpcionMenu) => void }) {
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: space[3], gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Icon name={iconoGrupo(grupo.titulo)} size={18} color="primary" />
        <Text type="bodyStrong" style={{ flex: 1 }}>
          {grupo.titulo}
        </Text>
        {hoy === 0 ? (
          <Text type="bodySm" color="textMuted">
            ninguno hoy
          </Text>
        ) : (
          <Text type="bodySm" color="textMuted">
            <Text type="monoSm">{hoy}</Text> hoy
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {grupo.botones.map(boton => (
          <View key={boton.evento.id} style={{ flex: 1 }}>
            <Button
              label={boton.evento.boton}
              sentido={direccionDe(boton.evento)}
              size="md"
              disabled={!boton.habilitado}
              accessibilityLabel={`${grupo.titulo}: ${boton.evento.boton}${boton.habilitado ? '' : '. Requiere conexión'}`}
              onPress={() => alAbrir(boton.opcion)}
            />
          </View>
        ))}
        {grupo.botones.length === 1 ? <View style={{ flex: 1 }} /> : null}
      </View>
    </View>
  );
}

/** Cuánto se registró hoy en este equipo, qué falta enviar y el último registro, para repetirlo. */
function HoyEnEsteEquipo({ disparos, porEnviar, inicio, alAbrir }: { disparos: Disparo[]; porEnviar: number; inicio: DatosInicio; alAbrir: (o: OpcionMenu) => void }) {
  const rechazados = disparos.filter(d => d.estado === 'Rechazado').length;
  const ultimo = disparos[0];
  const ev = ultimo ? eventoPorId(ultimo.idEvento) : undefined;
  const boton = ultimo ? inicio.eventos.flatMap(g => g.botones).find(b => b.evento.id === ultimo.idEvento) : undefined;
  return (
    <>
      <SectionTitle text="Hoy en este equipo" aside={fechaLarga()} />
      <Card padding={0}>
        <View style={{ flexDirection: 'row', padding: 14, gap: space[4] }}>
          <Cifra rotulo="Registrados" valor={disparos.length} />
          <Cifra rotulo="Por enviar" valor={porEnviar} color={porEnviar > 0 ? 'warning' : 'text'} />
          <Cifra rotulo="Rechazados" valor={rechazados} color={rechazados > 0 ? 'danger' : 'text'} />
        </View>
        <Divider />
        {ultimo ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: 14, paddingVertical: space[3] }}>
              <View style={{ flex: 1 }}>
                <Text type="label" color="textMuted">
                  {`Último registro · ${horaDe(ultimo.fechaHora)}`}
                </Text>
                <Text type="mono">{ultimo.guia}</Text>
                <Text type="bodySm" color="textMuted">
                  {[ev ? nombreEvento(ev) : null, ultimo.nombreCamaronera].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <ChipDisparo estado={ultimo.estado} />
            </View>
            {boton && ev ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                <Button label={textoRepetir(ev)} variant="secondary" icon="scan-barcode" size="md" disabled={!boton.habilitado} onPress={() => alAbrir(boton.opcion)} />
              </View>
            ) : null}
          </>
        ) : (
          <Text type="bodySm" color="textMuted" style={{ padding: 14 }}>
            Todavía no se registran eventos hoy en este equipo.
          </Text>
        )}
      </Card>
    </>
  );
}

/** Una cifra en monoespaciada con su rótulo debajo: tres en fila no se juntan ni con letra grande. */
function Cifra({ rotulo, valor, color = 'text' }: { rotulo: string; valor: number; color?: 'text' | 'warning' | 'danger' }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text type="numLg" color={color}>
        {valor}
      </Text>
      <Text type="bodySm" color="textMuted" numberOfLines={1}>
        {rotulo}
      </Text>
    </View>
  );
}
