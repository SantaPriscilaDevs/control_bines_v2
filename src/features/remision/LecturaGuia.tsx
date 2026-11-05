import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Banner,
  Button,
  Card,
  Conexion,
  ContadorLectura,
  Conteos,
  Divider,
  Header,
  HeaderButton,
  Icon,
  ListRow,
  Screen,
  StatusChip,
  Text,
  TextField,
  TypeTag,
  confirmar,
  type Conteo,
} from '@/components/ui';
import { configuracionRfid, lectorRfid, pitar, RFID_CONTINUA } from '@/hardware';
import { useGatillo } from '@/hardware/useGatillo';
import { mensajeDe } from '@/lib/api';
import { useEnLinea } from '@/lib/red';
import type { PantallaProps } from '@/navigation/tipos';
import { hit, space } from '@/styles/theme';
import { ID_INGRESO_REMISION, ID_SALIDA_REMISION } from '@/features/eventos/catalogo';
import { enviarAhora } from '@/features/pendientes/sincronizacion';
import { usePlantaActiva } from '@/features/sesion/sesion';
import { numeroRemision, tagCorto, type ResultadoTag, type TagRevisado, type ValidacionInventario } from './reglas';
import { guardar as guardarEnErp, guardarSinConexion, validarInventario } from './servicio';

interface Leido {
  epc: string;
  /** null mientras no se valide. */
  revision: TagRevisado | null;
}

const FILTROS: ResultadoTag[] = ['registrado', 'noRegistrado', 'invalido'];
const TEXTO_INVALIDO = 'Sin stock';

const prioridad = (r: ResultadoTag | undefined) => {
  if (r === 'noRegistrado') return 0;
  if (r === 'invalido') return 1;
  if (r === undefined) return 2;
  return 3;
};

/**
 * Lectura de los bines de una guía de remisión: mientras el gatillo está apretado se acumulan los
 * tags (sin repetir, con un pitido por tag nuevo) y al soltarlo se validan todos, sin botón «Validar».
 */
export default function LecturaGuia({ route, navigation }: PantallaProps<'LecturaGuia'>) {
  const { guia, serie, ingreso, bines, sinConexion = false, devolucion = false } = route.params;
  const sesion = usePlantaActiva();
  const enLinea = useEnLinea();
  const [leidos, setLeidos] = useState<Leido[]>([]);
  const [leyendo, setLeyendo] = useState(false);
  const [validando, setValidando] = useState(false);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const [lectorNoDisponible, setLectorNoDisponible] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<number | null>(null);
  const [totalManual, setTotalManual] = useState(bines);
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validacion = useRef<ValidacionInventario | null>(null);
  const detener = useRef<(() => void) | null>(null);
  const consulta = useRef(0);
  const vistos = useRef(new Set<string>());
  const estado = useRef({ leidos, guardando, validando });
  useEffect(() => {
    estado.current = { leidos, guardando, validando };
  }, [leidos, guardando, validando]);

  /** Sin conexión no se sabe cuántos bines lleva la guía: no hay tope. */
  const maximo = sinConexion ? null : bines;

  // La potencia y el modo del lector los manda el ERP en la opción del menú.
  const configuracion = useMemo(() => {
    const opcion = sesion?.opciones.find(o => o.id === (ingreso ? ID_INGRESO_REMISION : ID_SALIDA_REMISION));
    return configuracionRfid(opcion?.json.uhf_power, opcion?.json.uhf_mode, RFID_CONTINUA);
  }, [sesion?.opciones, ingreso]);

  // El lector se abre mientras la pantalla está visible y se suelta al salir.
  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      lectorRfid.abrir(configuracion).then(r => vigente && setLectorNoDisponible(r.lista ? null : r.motivo));
      return () => {
        vigente = false;
        detener.current?.();
        detener.current = null;
        setLeyendo(false);
        lectorRfid.cerrar();
      };
    }, [configuracion]),
  );

  const validar = useCallback(
    (tags: string[]) => {
      if (!sesion || tags.length === 0) return;
      const id = ++consulta.current;
      setValidando(true);
      setErrorLectura(null);
      validarInventario(tags, ingreso, sesion.planta.id)
        .then(resultado => {
          // Si llegó otra lectura mientras se validaba, esta respuesta ya no sirve.
          if (id !== consulta.current) return;
          validacion.current = resultado;
          const porTag = new Map(resultado.tags.map(t => [t.tag.toUpperCase(), t]));
          setLeidos(actuales => actuales.map(l => ({ ...l, revision: porTag.get(l.epc.toUpperCase()) ?? null })));
        })
        .catch(e => id === consulta.current && setErrorLectura(mensajeDe(e, 'No se pudieron validar los bines. Intente nuevamente.')))
        .finally(() => id === consulta.current && setValidando(false));
    },
    [ingreso, sesion],
  );

  useGatillo(
    () => {
      if (detener.current || estado.current.validando || estado.current.guardando || lectorNoDisponible) return;
      setLeyendo(true);
      setErrorLectura(null);
      detener.current = lectorRfid.leer(epc => {
        // El lector repite cada tag muchas veces: suena y se agrega solo la primera.
        if (vistos.current.has(epc)) return;
        vistos.current.add(epc);
        pitar();
        setLeidos(actuales => [...actuales, { epc, revision: null }]);
      });
    },
    () => {
      if (!detener.current) return;
      detener.current();
      detener.current = null;
      setLeyendo(false);
      // Sin conexión los bines se guardan sin validar; el ERP los revisa al sincronizar.
      const actuales = estado.current.leidos;
      if (!sinConexion && actuales.some(l => !l.revision)) validar(actuales.map(l => l.epc));
    },
  );

  const cantidad = leidos.length;
  const validados = cantidad > 0 && leidos.every(l => l.revision);
  const contar = (r: ResultadoTag) => leidos.filter(l => l.revision?.resultado === r).length;
  const conteos: Conteo[] = [
    { cantidad: contar('registrado'), etiqueta: 'Registrados', tono: 'success' },
    { cantidad: contar('noRegistrado'), etiqueta: 'Sin registro', tono: 'danger' },
    { cantidad: contar('invalido'), etiqueta: TEXTO_INVALIDO, tono: 'warning' },
  ];
  const visibles = filtro == null ? leidos : leidos.filter(l => l.revision?.resultado === FILTROS[filtro]);
  const ocupado = leyendo || validando || guardando;

  const limpiar = () => {
    consulta.current++;
    validacion.current = null;
    vistos.current.clear();
    setLeidos([]);
    setValidando(false);
    setErrorLectura(null);
    setFiltro(null);
    setTotalManual(bines);
    setObservaciones('');
    setError(null);
  };

  const guardar = async () => {
    if (!sesion || guardando) return;
    let falla: string | null = null;
    if (maximo != null && totalManual > maximo) falla = `El total manual supera los ${maximo} bines de la guía.`;
    else if (maximo != null && cantidad > maximo) falla = `Leyó ${cantidad} bines y la guía lleva ${maximo}. Limpie la lectura y vuelva a leer solo los de la guía.`;
    else if (!sinConexion && cantidad > 0 && !validados) falla = 'Espere a que se validen los bines.';
    if (falla) {
      setError(falla);
      return;
    }
    const movimiento = { guia, ingreso, totalManual, observaciones };
    const epcs = leidos.map(l => l.epc);
    setGuardando(true);
    setError(null);
    try {
      if (sinConexion) {
        await guardarSinConexion({ serie, guia, devolucion }, movimiento, epcs, sesion.planta);
        // Si la red volvió mientras se leía, no hay que esperar al próximo reintento.
        enviarAhora();
        confirmar(`Guía ${guia} guardada en el equipo. Se enviará cuando vuelva la conexión.`);
      } else {
        await guardarEnErp(movimiento, validacion.current, epcs, sesion.planta.id);
        confirmar(`${ingreso ? 'Ingreso' : 'Salida'} de ${guia} registrada con ${epcs.length} bines.`);
      }
      navigation.goBack();
    } catch (e) {
      setGuardando(false);
      setError(mensajeDe(e, 'No se pudo guardar el movimiento. Comuníquese con Sistemas.'));
    }
  };

  const conObjetivo = !sinConexion && bines > 0;
  let unidad = cantidad === 1 ? 'bin leído' : 'bines leídos';
  if (conObjetivo) unidad = `de ${bines} bines de la guía`;
  let ayuda = 'Se validan solos al soltar el gatillo.';
  if (validando) ayuda = 'Validando…';
  else if (sinConexion) ayuda = 'Mantenga el gatillo para leer.';

  return (
    <Screen
      header={
        <Header
          title={numeroRemision(serie, guia)}
          overline={devolucion ? 'Devolución' : 'Guía de remisión'}
          navigation={<HeaderButton icon="chevron-left" accessibilityLabel="Volver" onPress={() => navigation.goBack()} />}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <TypeTag text={ingreso ? 'Ingreso' : 'Salida'} icon={ingreso ? 'log-in' : 'log-out'} onBrand />
            <Conexion enLinea={enLinea} />
          </View>
        </Header>
      }
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}>
            <Button label="Limpiar" variant="secondary" onPress={limpiar} disabled={cantidad === 0 || ocupado} />
          </View>
          <View style={{ flex: 3 }}>
            <Button
              label={guardando ? 'Guardando…' : `Guardar ${ingreso ? 'ingreso' : 'salida'} · ${cantidad}`}
              onPress={guardar}
              disabled={ocupado || !(sinConexion || cantidad === 0 || validados)}
            />
          </View>
        </View>
      }
    >
      {lectorNoDisponible ? <Banner tone="danger" message={lectorNoDisponible} /> : null}
      {sinConexion ? (
        <Banner
          tone="warning"
          message={
            enLinea
              ? 'Volvió la conexión, pero esta guía se escribió a mano: lo leído se guarda en el equipo y se envía enseguida.'
              : 'Los bines no se validan ahora: se guardan en el equipo y se validan al sincronizar.'
          }
        />
      ) : null}
      <ContadorLectura cantidad={cantidad} unidad={unidad} ayuda={ayuda} leyendo={leyendo} objetivo={conObjetivo ? bines : null} />
      {errorLectura ? <Banner tone="danger" message={errorLectura} /> : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      {validados ? <Conteos conteos={conteos} seleccionado={filtro} alSeleccionar={setFiltro} /> : null}
      <TotalManual valor={totalManual} maximo={maximo} alCambiar={setTotalManual} habilitado={!guardando} />
      <TextField label="Observaciones" value={observaciones} onChangeText={setObservaciones} placeholder="Opcional" editable={!guardando} />
      <ListaTags leidos={visibles} />
    </Screen>
  );
}

/** Contador con − y + para los bines sin tag, que se suman al total de la guía. */
function TotalManual({ valor, maximo, alCambiar, habilitado }: { valor: number; maximo: number | null; alCambiar: (v: number) => void; habilitado: boolean }) {
  const cambiar = (nuevo: number) => alCambiar(Math.max(0, maximo == null ? nuevo : Math.min(nuevo, maximo)));
  const boton = (icono: 'minus' | 'plus', etiqueta: string, nuevo: number, activo: boolean) => (
    <Pressable
      onPress={() => cambiar(nuevo)}
      disabled={!activo}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={{ width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center', opacity: activo ? 1 : 0.45 }}
    >
      <Icon name={icono} size={20} color="primary" />
    </Pressable>
  );
  return (
    <Card padding={3}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={{ flex: 1 }}>
          <Text type="bodyStrong">Bines sin tag</Text>
          <Text type="bodySm" color="textMuted">
            {maximo != null ? `Se suman al total de la guía, que lleva ${maximo}.` : 'Se suman al total de la guía.'}
          </Text>
        </View>
        {boton('minus', 'Restar uno', valor - 1, habilitado && valor > 0)}
        <Text type="numMd" align="center" style={{ minWidth: 40 }}>
          {valor}
        </Text>
        {boton('plus', 'Sumar uno', valor + 1, habilitado && (maximo == null || valor < maximo))}
      </View>
    </Card>
  );
}

const MAXIMO_LISTA = 200;

/** Los tags leídos con su resultado (o «Leído» si todavía no se validó), con los problemas primero. */
function ListaTags({ leidos }: { leidos: Leido[] }) {
  if (leidos.length === 0) return null;
  const ordenados = [...leidos].sort((a, b) => prioridad(a.revision?.resultado) - prioridad(b.revision?.resultado));
  const conProblema = leidos.filter(l => l.revision && l.revision.resultado !== 'registrado').length;
  return (
    <>
      {conProblema > 0 ? (
        <Text type="titleSubject">{conProblema === 1 ? 'Con problema · 1 bin' : `Con problema · ${conProblema} bines`}</Text>
      ) : null}
      <Card padding={0}>
        {ordenados.slice(0, MAXIMO_LISTA).map((l, i) => (
          <View key={l.epc}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              headline={tagCorto(l.epc)}
              monospace
              supporting={l.revision?.descripcion ?? (l.revision?.resultado === 'noRegistrado' ? 'No está en el inventario' : null)}
              trailing={<ChipTag resultado={l.revision?.resultado} />}
            />
          </View>
        ))}
        {leidos.length > MAXIMO_LISTA ? (
          <Text type="bodySm" color="textMuted" style={{ padding: space[3] }}>
            {`y ${leidos.length - MAXIMO_LISTA} más`}
          </Text>
        ) : null}
      </Card>
    </>
  );
}

function ChipTag({ resultado }: { resultado: ResultadoTag | undefined }) {
  if (resultado === 'registrado') return <StatusChip text="Registrado" tone="success" />;
  if (resultado === 'noRegistrado') return <StatusChip text="Sin registro" tone="danger" />;
  if (resultado === 'invalido') return <StatusChip text={TEXTO_INVALIDO} tone="warning" />;
  return <StatusChip text="Leído" tone="neutral" />;
}
