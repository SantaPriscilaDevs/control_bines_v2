import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Banner,
  Button,
  Card,
  Conexion,
  Dato,
  Datos,
  Divider,
  Header,
  HeaderButton,
  IconTile,
  ListRow,
  Screen,
  SectionTitle,
  SegmentedControl,
  Selector,
  Sheet,
  StatusChip,
  Text,
  TextField,
  TypeTag,
  TypeTags,
  confirmar,
} from '@/components/ui';
import { mensajeDe } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useEnLinea } from '@/lib/red';
import type { PantallaProps } from '@/navigation/tipos';
import { space } from '@/styles/theme';
import { diaLocal } from '@/features/eventos/reglas';
import { ID_INGRESO_REMISION, ID_SALIDA_REMISION } from '@/features/eventos/catalogo';
import { fechaRelativa } from '@/features/inicio/textos';
import { usePlantaActiva } from '@/features/sesion/sesion';
import { esDevolucion, motivoInicial, numeroRemision, tipoInicial, type GuiaRemision, type MotivoGuia, type TipoGuia } from './reglas';
import { catalogos as cargarCatalogos, guardarDevolucion, guias as cargarGuias } from './servicio';

/** Guías de remisión: salida e ingreso en la misma pantalla. Tocar una guía la abre para leer sus bines. */
export default function Remision({ route, navigation }: PantallaProps<'Remision'>) {
  const sesion = usePlantaActiva();
  const enLinea = useEnLinea();
  const planta = sesion?.planta.id ?? '';
  const ids = new Set(sesion?.opciones.map(o => o.id) ?? []);
  // El rol tiene Salida e Ingreso: se cambia aquí sin volver al Inicio.
  const puedeCambiar = ids.has(ID_SALIDA_REMISION) && ids.has(ID_INGRESO_REMISION);
  const [ingreso, setIngreso] = useState(route.params.ingreso);
  const [fecha, setFecha] = useState(() => new Date());
  const [tipoElegido, setTipo] = useState<TipoGuia | null>(null);
  const [motivoElegido, setMotivo] = useState<MotivoGuia | null>(null);
  const [eligiendo, setEligiendo] = useState<'tipo' | 'motivo' | null>(null);
  const [abierta, setAbierta] = useState<GuiaRemision | null>(null);

  const catalogos = useQuery({ queryKey: queryKeys.catalogosRemision, queryFn: cargarCatalogos, staleTime: Infinity });
  const tipo = tipoElegido ?? (catalogos.data ? tipoInicial(catalogos.data) : null);
  const motivo = motivoElegido ?? (catalogos.data ? motivoInicial(catalogos.data) : null);

  const filtros = useMemo(() => ({ fecha: diaLocal(fecha), planta, tipo: tipo?.codigo, motivo: motivo?.codigo, ingreso }), [fecha, planta, tipo, motivo, ingreso]);
  const habilitada = enLinea && !!tipo && !!motivo && !!planta;
  const guias = useQuery({
    queryKey: queryKeys.guiasRemision(filtros),
    queryFn: () => cargarGuias(filtros.fecha, planta, tipo!, motivo!, ingreso),
    enabled: habilitada,
    staleTime: 0,
  });

  // Al volver de leer una guía se recarga, para que se vea registrada y no se guarde dos veces.
  const { refetch } = guias;
  useFocusEffect(
    useCallback(() => {
      if (habilitada) refetch();
    }, [habilitada, refetch]),
  );

  const elegirFecha = () =>
    DateTimePickerAndroid.open({
      value: fecha,
      mode: 'date',
      // Como la app vieja: hasta un mes atrás y nunca en el futuro.
      maximumDate: new Date(),
      minimumDate: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
      })(),
      onChange: (evento, elegida) => {
        if (evento.type === 'set' && elegida) setFecha(elegida);
      },
    });

  const abrir = (guia: GuiaRemision) => {
    if (guia.registrada) {
      confirmar(ingreso ? `El ingreso de ${guia.numero} ya está registrado.` : `La salida de ${guia.numero} ya está registrada.`);
      return;
    }
    setAbierta(guia);
  };

  const leer = (guia: GuiaRemision) => {
    setAbierta(null);
    navigation.navigate('LecturaGuia', { guia: guia.numero, serie: guia.serie, ingreso, bines: guia.bines });
  };

  return (
    <>
      <Screen
        header={
          <Header
            title="Guías de remisión"
            overline="Salidas"
            navigation={<HeaderButton icon="chevron-left" accessibilityLabel="Volver" onPress={() => navigation.goBack()} />}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <TypeTag text={ingreso ? 'Ingreso' : 'Salida'} icon={ingreso ? 'log-in' : 'log-out'} onBrand />
              <Conexion enLinea={enLinea} />
            </View>
          </Header>
        }
      >
        {puedeCambiar ? (
          <View style={{ gap: 6 }}>
            <Text type="bodySmStrong">Movimiento</Text>
            <SegmentedControl<boolean>
              accessibilityLabel="Movimiento"
              value={ingreso}
              onChange={valor => setIngreso(valor)}
              disabled={guias.isFetching}
              options={[
                { value: false, label: 'Salida', sentido: 'salida' },
                { value: true, label: 'Ingreso', sentido: 'ingreso' },
              ]}
            />
          </View>
        ) : null}
        <Selector rotulo="Tipo de guía" valor={tipo?.nombre ?? null} onPress={() => setEligiendo('tipo')} disabled={!catalogos.data} />
        <Selector rotulo="Motivo" valor={motivo?.nombre ?? null} onPress={() => setEligiendo('motivo')} disabled={!catalogos.data} />
        {catalogos.isError ? (
          <Banner
            tone="danger"
            message={mensajeDe(catalogos.error, 'No se pudieron cargar los tipos de guía.')}
            action={<Button label="Reintentar" variant="secondary" icon="refresh-cw" onPress={() => catalogos.refetch()} />}
          />
        ) : null}
        {enLinea ? (
          <>
            <Selector rotulo="Fecha de emisión" valor={fechaRelativa(fecha)} onPress={elegirFecha} />
            <ListaGuias
              guias={guias.data ?? []}
              cargando={guias.isPending && guias.fetchStatus === 'fetching'}
              error={guias.isError ? mensajeDe(guias.error, 'No se pudieron cargar las guías.') : null}
              ingreso={ingreso}
              alAbrir={abrir}
              alReintentar={() => guias.refetch()}
            />
          </>
        ) : (
          <GuiaSinConexion
            alLeer={(serie, guia) =>
              navigation.navigate('LecturaGuia', { guia, serie, ingreso, bines: 0, sinConexion: true, devolucion: esDevolucion(motivo) })
            }
          />
        )}
      </Screen>
      <HojaOpciones
        visible={eligiendo === 'tipo'}
        titulo="Tipo de guía"
        opciones={catalogos.data?.tipos ?? []}
        alElegir={t => {
          setTipo(t);
          setEligiendo(null);
        }}
        alCerrar={() => setEligiendo(null)}
      />
      <HojaOpciones
        visible={eligiendo === 'motivo'}
        titulo="Motivo"
        opciones={catalogos.data?.motivos ?? []}
        alElegir={m => {
          setMotivo(m);
          setEligiendo(null);
        }}
        alCerrar={() => setEligiendo(null)}
      />
      <HojaGuia
        guia={abierta}
        motivo={motivo}
        ingreso={ingreso}
        planta={planta}
        alLeer={leer}
        alCerrar={() => setAbierta(null)}
        alRegistrar={() => {
          setAbierta(null);
          guias.refetch();
        }}
      />
    </>
  );
}

function ListaGuias({
  guias,
  cargando,
  error,
  ingreso,
  alAbrir,
  alReintentar,
}: {
  guias: GuiaRemision[];
  cargando: boolean;
  error: string | null;
  ingreso: boolean;
  alAbrir: (g: GuiaRemision) => void;
  alReintentar: () => void;
}) {
  if (cargando && guias.length === 0) return <Banner tone="info" message="Cargando guías…" />;
  if (error) {
    return <Banner tone="danger" message={error} action={<Button label="Reintentar" variant="secondary" icon="refresh-cw" onPress={alReintentar} />} />;
  }
  if (guias.length === 0) {
    // Vacío no es éxito: tono neutro.
    return <Banner tone="neutral" title="Ninguna guía de ese tipo y motivo en esa fecha." message="Pruebe con otro motivo o con otra fecha." />;
  }
  const pendientes = guias.filter(g => !g.registrada).length;
  return (
    <>
      <SectionTitle text={guias.length === 1 ? '1 guía' : `${guias.length} guías`} aside={pendientes > 0 ? 'toque una para leer' : null} />
      <Card padding={0}>
        {guias.map((g, i) => (
          <View key={`${g.serie}-${g.numero}`}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              headline={numeroRemision(g.serie, g.numero)}
              monospace
              supporting={(ingreso ? g.partida : (g.destinatario ?? g.llegada)) ?? g.transporte}
              leading={<IconTile icon="truck" />}
              trailing={
                g.registrada ? (
                  <StatusChip text="Registrada" tone="success" />
                ) : (
                  <Text type="monoSm" color="textMuted">{`${g.bines} bines`}</Text>
                )
              }
              onPress={() => alAbrir(g)}
              accessibilityLabel={`Guía ${numeroRemision(g.serie, g.numero)}${g.registrada ? ', registrada' : `, ${g.bines} bines`}`}
            />
          </View>
        ))}
      </Card>
    </>
  );
}

/** Sin conexión no hay lista: se escribe la guía y lo leído queda en el equipo hasta que vuelva la red. */
function GuiaSinConexion({ alLeer }: { alLeer: (serie: string, guia: string) => void }) {
  const [serie, setSerie] = useState('');
  const [guia, setGuia] = useState('');
  const [errores, setErrores] = useState<{ serie?: string; guia?: string }>({});
  const continuar = () => {
    // Los mínimos de `MovimientosTraslados` para la serie y la guía.
    const nuevos = {
      serie: serie.trim().length < 5 ? 'La serie tiene al menos 5 caracteres.' : undefined,
      guia: guia.trim().length < 4 ? 'La guía tiene al menos 4 caracteres.' : undefined,
    };
    setErrores(nuevos);
    if (!nuevos.serie && !nuevos.guia) alLeer(serie.trim(), guia.trim());
  };
  return (
    <>
      <Banner
        tone="warning"
        title="Sin conexión."
        message="Escriba la serie y el número de la guía. Los bines que lea se guardan en el equipo y se envían cuando vuelva la conexión."
      />
      <TextField label="Serie" value={serie} onChangeText={setSerie} placeholder="Ej. 001007" keyboardType="number-pad" error={errores.serie} returnKeyType="next" />
      <TextField
        label="Número de guía"
        value={guia}
        onChangeText={setGuia}
        placeholder="Ej. 000123456"
        keyboardType="number-pad"
        error={errores.guia}
        returnKeyType="done"
        onSubmitEditing={continuar}
      />
      <Button label="Leer bines" icon="arrow-right" onPress={continuar} />
    </>
  );
}

function HojaOpciones<T extends { codigo: number; nombre: string }>({
  visible,
  titulo,
  opciones,
  alElegir,
  alCerrar,
}: {
  visible: boolean;
  titulo: string;
  opciones: T[];
  alElegir: (o: T) => void;
  alCerrar: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={alCerrar} title={titulo}>
      <View>
        {opciones.map((o, i) => (
          <View key={o.codigo}>
            {i > 0 ? <Divider /> : null}
            <Pressable onPress={() => alElegir(o)} accessibilityRole="button" style={{ paddingVertical: 14 }}>
              <Text type="bodyStrong">{o.nombre || `Código ${o.codigo}`}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

/** Los datos de la guía antes de leer sus bines. Una devolución se registra aquí mismo, sin leer bines. */
function HojaGuia({
  guia,
  motivo,
  ingreso,
  planta,
  alLeer,
  alCerrar,
  alRegistrar,
}: {
  guia: GuiaRemision | null;
  motivo: MotivoGuia | null;
  ingreso: boolean;
  planta: string;
  alLeer: (g: GuiaRemision) => void;
  alCerrar: () => void;
  alRegistrar: () => void;
}) {
  const [observaciones, setObservaciones] = useState('');
  const devolucion = esDevolucion(motivo);
  const registro = useMutation({
    mutationFn: (g: GuiaRemision) => guardarDevolucion(g, ingreso, observaciones, planta),
    onSuccess: (_, g) => {
      confirmar(`Devolución de ${g.numero} registrada.`);
      setObservaciones('');
      alRegistrar();
    },
  });
  const cerrar = () => {
    registro.reset();
    setObservaciones('');
    alCerrar();
  };
  return (
    <Sheet visible={!!guia} onClose={cerrar} title="Guía de remisión" aside={motivo?.nombre}>
      {guia ? (
        <>
          <Text type="numMd">{numeroRemision(guia.serie, guia.numero)}</Text>
          {devolucion ? null : <TypeTags texts={[`${guia.bines} bines`]} />}
          <Datos>
            <Dato rotulo="Placa" valor={guia.placa} mono enFila />
            <Dato rotulo="Conductor" valor={guia.conductor} enFila />
          </Datos>
          <Dato rotulo="Transporte" valor={guia.transporte} />
          <Datos>
            <Dato rotulo="Partida" valor={guia.partida} enFila />
            <Dato rotulo="Llegada" valor={guia.llegada} enFila />
          </Datos>
          {guia.observacion ? <Dato rotulo="Observación de la guía" valor={guia.observacion} /> : null}
          {guia.detalle.length ? (
            <View style={{ gap: space[1] }}>
              <Text type="label" color="textMuted">
                Detalle
              </Text>
              {guia.detalle.map((linea, i) => (
                <View key={`${linea.descripcion}-${i}`} style={{ flexDirection: 'row', gap: space[2] }}>
                  <Text type="bodySm" style={{ flex: 1 }}>
                    {linea.descripcion}
                  </Text>
                  <Text type="bodySmStrong">{[linea.cantidad, linea.unidad].filter(Boolean).join(' ')}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {registro.isError ? <Banner tone="danger" message={mensajeDe(registro.error, 'No se pudo registrar la devolución. Comuníquese con Sistemas.')} /> : null}
          {devolucion ? (
            <>
              <TextField label="Observaciones" value={observaciones} onChangeText={setObservaciones} placeholder="Opcional" editable={!registro.isPending} />
              <Button label={registro.isPending ? 'Guardando…' : 'Registrar devolución'} onPress={() => registro.mutate(guia)} disabled={registro.isPending} />
            </>
          ) : (
            <Button label="Leer bines" icon="arrow-right" onPress={() => alLeer(guia)} />
          )}
        </>
      ) : null}
    </Sheet>
  );
}
