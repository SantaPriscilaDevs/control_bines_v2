import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Banner,
  Button,
  Card,
  Conexion,
  Divider,
  Header,
  HeaderButton,
  Icon,
  ListRow,
  ScanPrompt,
  Screen,
  SectionTitle,
  Sheet,
  Text,
  TextField,
  TypeTag,
  type Tono,
} from '@/components/ui';
import { useLectorCodigos } from '@/hardware/useLectorCodigos';
import { esErrorApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { enLineaAhora, useEnLinea } from '@/lib/red';
import type { PantallaProps } from '@/navigation/tipos';
import { space } from '@/styles/theme';
import { useTheme } from '@/styles/useTheme';
import { useDisparosDeHoy } from '@/features/pendientes/sincronizacion';
import type { Camaronera } from '@/features/sesion/menu';
import { camaronerasGuardadas, usePlantaActiva } from '@/features/sesion/sesion';
import { direccionDe, enCamaronera, evento as eventoPorId, grupoDe, permiteSinPesca } from './catalogo';
import { consultarGuia, numeroMovimiento, registrar, type GuiaTrazabilidad } from './disparos';
import { FilaDisparo } from './FilaDisparo';
import { esGuia, textoBoton, textoRegistrado } from './reglas';
import TarjetaGuia from './TarjetaGuia';

interface Aviso {
  tono: Extract<Tono, 'success' | 'warning' | 'danger'>;
  texto: string;
}

type Fase =
  /** Esperando el gatillo. [aviso] cuenta qué pasó con el último registro o la última lectura. */
  | { tipo: 'lista'; aviso?: Aviso }
  | { tipo: 'validando'; guia: string }
  /**
   * [datos] es null si no se pudo consultar: sin conexión, o no se encontró ([noEncontrada]). En ese
   * caso registrar deja de ser la acción principal y pide confirmación.
   */
  | { tipo: 'leida'; guia: string; datos: GuiaTrazabilidad | null; aviso?: Aviso; registrando: boolean; noEncontrada: boolean };

/** Registrar un evento con la guía de movilización leída con el gatillo o escrita a mano. */
export default function Captura({ route, navigation }: PantallaProps<'Captura'>) {
  const evento = eventoPorId(route.params.idEvento)!;
  const grupo = grupoDe(evento).titulo;
  const sesion = usePlantaActiva();
  const enLinea = useEnLinea();
  const [camaronera, setCamaronera] = useState<Camaronera | null>(null);
  const [eligiendoCamaronera, setEligiendoCamaronera] = useState(false);
  const [sinPesca, setSinPesca] = useState(false);
  const [texto, setTexto] = useState('');
  const [fase, setFase] = useState<Fase>({ tipo: 'lista' });
  // El gatillo llega por fuera de React: mira la fase vigente, no la del último render.
  const faseActual = useRef(fase);
  useEffect(() => {
    faseActual.current = fase;
  }, [fase]);

  // El movimiento se numera con la secuencia de la camaronera en los eventos de camaronera.
  const idNumeracion = (enCamaronera(evento) && camaronera ? String(camaronera.id) : sesion?.planta.id) ?? '';
  const numero = useQuery({
    queryKey: queryKeys.numeroMovimiento(idNumeracion),
    queryFn: () => numeroMovimiento(idNumeracion),
    enabled: idNumeracion !== '',
    staleTime: 0,
  });
  const numeroActual = numero.data ?? null;

  const registrosHoy = useDisparosDeHoy().filter(d => d.idEvento === evento.id);

  const procesar = (leido: string) => {
    const guia = leido.trim().toUpperCase();
    if (!esGuia(guia)) {
      setFase({ tipo: 'lista', aviso: { tono: 'danger', texto: `«${guia}» no es un número de guía. Revíselo e intente nuevamente.` } });
      return;
    }
    setSinPesca(false);
    if (!enLineaAhora()) {
      setFase({
        tipo: 'leida',
        guia,
        datos: null,
        registrando: false,
        noEncontrada: false,
        aviso: { tono: 'warning', texto: 'Sin conexión no se puede consultar la guía. Si la registra, se enviará cuando vuelva la conexión.' },
      });
      return;
    }
    setFase({ tipo: 'validando', guia });
    consultarGuia(guia, evento, numeroActual, sesion?.planta.id ?? '')
      .then(datos => setFase({ tipo: 'leida', guia, datos, registrando: false, noEncontrada: false }))
      .catch(error => {
        const noEncontrada = esErrorApi(error) && error.tipo === 'http';
        let aviso: Aviso;
        if (esErrorApi(error) && error.tipo === 'sinConexion') {
          aviso = { tono: 'warning', texto: 'No hubo conexión para consultar la guía. Si la registra, se enviará cuando vuelva la conexión.' };
        } else if (noEncontrada) {
          aviso = { tono: 'danger', texto: 'Guía de movilización no encontrada. Comuníquese con Sistemas.' };
        } else {
          aviso = { tono: 'warning', texto: 'No se pudo consultar la guía. Si la registra, se validará cuando se envíe el registro.' };
        }
        setFase({ tipo: 'leida', guia, datos: null, aviso, registrando: false, noEncontrada });
      });
  };

  const ocupado = () => {
    const f = faseActual.current;
    return f.tipo === 'validando' || (f.tipo === 'leida' && f.registrando);
  };

  useLectorCodigos({
    alLeer: procesar,
    alFallar: motivo => setFase({ tipo: 'lista', aviso: { tono: 'danger', texto: motivo } }),
    puedeLeer: () => !ocupado(),
  });

  const buscarEscrita = () => {
    if (!texto.trim() || ocupado()) return;
    setTexto('');
    procesar(texto);
  };

  const descartar = () => {
    setFase({ tipo: 'lista' });
    setSinPesca(false);
  };

  const registrarLeida = async () => {
    if (fase.tipo !== 'leida' || fase.registrando || !sesion) return;
    if (enCamaronera(evento) && !camaronera) {
      setFase({ ...fase, aviso: { tono: 'danger', texto: 'Elija la camaronera antes de registrar.' } });
      return;
    }
    setFase({ ...fase, registrando: true });
    const resultado = await registrar({ evento, guia: fase.guia, coPlanta: sesion.planta.id, camaronera, sinPesca }, numeroActual);
    if (resultado.tipo === 'rechazado') {
      setFase({ ...fase, registrando: false, aviso: { tono: 'danger', texto: resultado.motivo } });
      return;
    }
    setSinPesca(false);
    if (resultado.tipo === 'registrado') {
      setFase({ tipo: 'lista', aviso: { tono: 'success', texto: `${textoRegistrado(evento)}: ${fase.guia}. Listo para la siguiente guía.` } });
      numero.refetch();
    } else {
      setFase({
        tipo: 'lista',
        aviso: { tono: 'warning', texto: `Sin conexión: la guía ${fase.guia} quedó guardada en el equipo y se enviará sola cuando vuelva la conexión.` },
      });
    }
  };

  // Nada irreversible en un clic: registrar una guía que no se encontró pide confirmación.
  const confirmarSinEncontrar = (guia: string) =>
    Alert.alert('Registrar guía no encontrada', `Va a registrar la guía ${guia}, que no se encontró. Se validará cuando se envíe el registro.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Registrar igual', onPress: registrarLeida },
    ]);

  const leida = fase.tipo === 'leida' ? fase : null;
  const pie = leida ? (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 2 }}>
        <Button label="Descartar" variant="secondary" onPress={descartar} disabled={leida.registrando} />
      </View>
      <View style={{ flex: 3 }}>
        <Button
          label={leida.registrando ? 'Registrando…' : leida.noEncontrada ? 'Registrar igual…' : textoBoton(evento)}
          variant={leida.noEncontrada ? 'secondary' : 'primary'}
          disabled={leida.registrando}
          onPress={leida.noEncontrada ? () => confirmarSinEncontrar(leida.guia) : registrarLeida}
        />
      </View>
    </View>
  ) : null;

  const lugar = camaronera?.nombre ?? sesion?.planta.nombre ?? '';
  const sentido = direccionDe(evento);

  return (
    <>
      <Screen
        header={
          <Header
            title={evento.boton}
            overline={grupo}
            navigation={<HeaderButton icon="chevron-left" accessibilityLabel="Volver al inicio" onPress={() => navigation.goBack()} />}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
              <TypeTag text={evento.tipoMov} icon={sentido === 'ingreso' ? 'log-in' : 'log-out'} onBrand />
              {/* Con letra grande pasa a dos líneas en vez de cortarse; «Mov. 2064» no se separa. */}
              <Text type="bodySm" color="onBrandMuted" style={{ flexShrink: 1 }}>
                {`${lugar} · Mov. ${numeroActual ?? '—'}`}
              </Text>
              <Conexion enLinea={enLinea} />
            </View>
          </Header>
        }
        footer={pie}
      >
        {enCamaronera(evento) ? <SelectorCamaronera camaronera={camaronera} alAbrir={() => setEligiendoCamaronera(true)} /> : null}

        {fase.tipo === 'lista' ? (
          <>
            {fase.aviso ? <Banner tone={fase.aviso.tono} message={fase.aviso.texto} /> : null}
            <ScanPrompt
              title={fase.aviso?.tono === 'danger' || !fase.aviso ? 'Presiona el gatillo' : 'Listo para la siguiente'}
              message={
                enLinea
                  ? 'Apunta al código de barras de la guía o de la pre-guía. Se valida al leerla.'
                  : 'Sin conexión no se valida la guía: revise el número antes de registrar.'
              }
              icon="scan-barcode"
              compact={!!fase.aviso}
            />
            <Card padding={3} gap={3}>
              <Text type="bodyStrong">O escriba el número de la guía</Text>
              <TextField
                label="Número de guía"
                value={texto}
                onChangeText={valor => setTexto(valor.toUpperCase())}
                placeholder="Ej. GM0004512"
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={buscarEscrita}
              />
              <Button label="Buscar" icon="search" onPress={buscarEscrita} disabled={!texto.trim()} />
            </Card>
          </>
        ) : null}

        {fase.tipo === 'validando' ? (
          <Card padding={3}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <ActivityIndicator size="small" />
              <View>
                <Text type="bodyStrong">Consultando la guía…</Text>
                <Text type="mono" color="textMuted">
                  {fase.guia}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {leida ? (
          <>
            {/* Si la guía se encontró, la tarjeta lo dice todo: no hace falta un aviso aparte. */}
            {leida.aviso ? <Banner tone={leida.aviso.tono} message={leida.aviso.texto} /> : null}
            <TarjetaGuia guia={leida.guia} datos={leida.datos} evento={evento} noEncontrada={leida.noEncontrada} />
            {permiteSinPesca(evento) ? <SinPesca valor={sinPesca} alCambiar={setSinPesca} habilitado={!leida.registrando} /> : null}
          </>
        ) : (
          <>
            <SectionTitle text="Guías registradas en este movimiento" aside={`${registrosHoy.length} hoy`} />
            {registrosHoy.length === 0 ? (
              <Text type="bodySm" color="textMuted">
                Todavía no se registran guías de este movimiento hoy en este equipo.
              </Text>
            ) : (
              <Card padding={0}>
                {registrosHoy.slice(0, 20).map((d, i) => (
                  <View key={d.id}>
                    {i > 0 ? <Divider /> : null}
                    <FilaDisparo disparo={d} />
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </Screen>
      <ListaCamaroneras
        visible={eligiendoCamaronera}
        alCerrar={() => setEligiendoCamaronera(false)}
        alElegir={c => {
          setCamaronera(c);
          setEligiendoCamaronera(false);
        }}
      />
    </>
  );
}

/** La camaronera queda fija arriba para las guías siguientes, con «Cambiar». */
function SelectorCamaronera({ camaronera, alAbrir }: { camaronera: Camaronera | null; alAbrir: () => void }) {
  return (
    <Card padding={0}>
      <ListRow
        headline={camaronera?.nombre ?? 'Elija la camaronera'}
        supporting={camaronera ? 'Camaronera' : 'Obligatoria para este evento'}
        leading={<Icon name="map-pin" color="primary" />}
        trailing={
          <Text type="bodySmStrong" color="primary">
            {camaronera ? 'Cambiar' : 'Elegir'}
          </Text>
        }
        onPress={alAbrir}
        accessibilityLabel={camaronera ? `Camaronera ${camaronera.nombre}. Cambiar` : 'Elegir la camaronera'}
      />
    </Card>
  );
}

function ListaCamaroneras({ visible, alCerrar, alElegir }: { visible: boolean; alCerrar: () => void; alElegir: (c: Camaronera) => void }) {
  const [filtro, setFiltro] = useState('');
  const camaroneras = useMemo(() => (visible ? camaronerasGuardadas() : []), [visible]);
  const visibles = camaroneras.filter(c => c.nombre.toLowerCase().includes(filtro.trim().toLowerCase()));
  return (
    <Sheet visible={visible} onClose={alCerrar} title="Camaronera" aside={camaroneras.length ? `${camaroneras.length}` : null}>
      <TextField label="Buscar" value={filtro} onChangeText={setFiltro} placeholder="Nombre de la camaronera" leadingIcon="search" />
      {camaroneras.length === 0 ? (
        <Banner tone="warning" message="No hay camaroneras guardadas. Vuelva a elegir la planta con conexión para descargarlas." />
      ) : null}
      <View>
        {visibles.map((c, i) => (
          <View key={c.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable onPress={() => alElegir(c)} accessibilityRole="button" style={{ paddingVertical: 14 }}>
              <Text type="bodyStrong">{c.nombre}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

/** Solo en la salida de garita camaronera: el camión puede salir sin pesca. */
function SinPesca({ valor, alCambiar, habilitado }: { valor: boolean; alCambiar: (v: boolean) => void; habilitado: boolean }) {
  const { color } = useTheme();
  return (
    <Card padding={3}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <View style={{ flex: 1 }}>
          <Text type="bodyStrong">Salió sin pesca</Text>
          <Text type="bodySm" color="textMuted">
            Marque si el camión sale de la camaronera sin carga.
          </Text>
        </View>
        <Switch
          value={valor}
          onValueChange={alCambiar}
          disabled={!habilitado}
          accessibilityLabel="Salió sin pesca"
          trackColor={{ true: color.primary, false: color.surfaceContainerHigh }}
          thumbColor={color.surface}
        />
      </View>
    </Card>
  );
}
