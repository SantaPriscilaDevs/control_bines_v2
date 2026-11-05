import React, { useCallback, useState } from 'react';
import { Alert, BackHandler, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import {
  Banner,
  Button,
  Card,
  Dato,
  Datos,
  Header,
  HeaderButton,
  HighlightBox,
  ScanPrompt,
  Screen,
  Selector,
  Text,
  TextField,
  TypeTag,
  TypeTags,
  confirmar,
  type Tono,
} from '@/components/ui';
import { esErrorApi, mensajeDe } from '@/lib/api';
import type { PantallaProps } from '@/navigation/tipos';
import { radius, space } from '@/styles/theme';
import { makeStyles } from '@/styles/makeStyles';
import { fechaCorta } from '@/features/inicio/textos';
import { usePlantaActiva } from '@/features/sesion/sesion';
import { embarque as buscarEmbarque, guardarSellado, mensajeEmbarque, type Embarque } from './servicio';

const useStyles = makeStyles(color => ({
  pasos: { flexDirection: 'row', gap: space[2] },
  pasoActual: { backgroundColor: color.onBrand, borderRadius: 6, paddingHorizontal: space[2], paddingVertical: 4 },
  fila: { flexDirection: 'row', gap: space[3] },
  mitad: { flex: 1 },
  botones: { flexDirection: 'row', gap: 10 },
  resumen: { borderRadius: radius.control },
}));

const ahora = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return d;
};

const dos = (n: number) => String(n).padStart(2, '0');

/** Salida de exportación: buscar el embarque, compararlo con el camión y registrar el sellado. */
export default function Exportacion({ navigation }: PantallaProps<'Exportacion'>) {
  const styles = useStyles();
  const sesion = usePlantaActiva();
  const planta = sesion?.planta.id ?? '';
  const [texto, setTexto] = useState('');
  const [embarque, setEmbarque] = useState<Embarque | null>(null);
  const [aviso, setAviso] = useState<{ tono: Tono; texto: string } | null>(null);
  const [enSellado, setEnSellado] = useState(false);
  const [momento, setMomento] = useState(ahora);
  /** Se eligió fecha u hora a mano: al volver al sellado no se pisan con la hora actual. */
  const [momentoElegido, setMomentoElegido] = useState(false);
  const [custodia, setCustodia] = useState('');
  const [placas, setPlacas] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [errores, setErrores] = useState<{ custodia?: string; placas?: string }>({});

  const limpiar = () => {
    setTexto('');
    setEmbarque(null);
    setAviso(null);
    setEnSellado(false);
    setMomento(ahora());
    setMomentoElegido(false);
    setCustodia('');
    setPlacas('');
    setObservaciones('');
    setErrores({});
  };

  const busqueda = useMutation({
    mutationFn: (numero: string) => buscarEmbarque(numero, planta),
    onSuccess: setEmbarque,
    onError: (error, numero) => {
      // «Embarque ya registrado» y «N° Embarque no encontrado» llegan con 400: se explican en español.
      if (esErrorApi(error) && error.tipo === 'http' && error.codigo! < 500 && error.mensajeServidor) {
        setAviso({ tono: 'warning', texto: mensajeEmbarque(numero, error.mensajeServidor) });
      } else {
        setAviso({ tono: 'danger', texto: mensajeDe(error, 'No se pudo consultar el embarque. Comuníquese con Sistemas.') });
      }
    },
  });

  const guardado = useMutation({
    mutationFn: (e: Embarque) => guardarSellado(e, { momento, custodia, placas, observaciones }, planta),
    onSuccess: (_, e) => {
      confirmar(`Salida del embarque ${e.numero} registrada.`);
      limpiar();
    },
    onError: error => setAviso({ tono: 'danger', texto: mensajeDe(error, 'No se pudo registrar la salida. Comuníquese con Sistemas.') }),
  });

  const buscar = () => {
    const numero = texto.trim();
    if (!numero) {
      setAviso({ tono: 'warning', texto: 'Escriba el número de embarque.' });
      return;
    }
    setAviso(null);
    setEmbarque(null);
    busqueda.mutate(numero);
  };

  /** Fecha y hora llegan con el momento actual; lo escrito en el sellado se conserva al volver. */
  const irAlSellado = () => {
    if (!momentoElegido) setMomento(ahora());
    setAviso(null);
    setEnSellado(true);
  };

  // En el sellado, Atrás vuelve a los datos sin perder lo escrito.
  useFocusEffect(
    useCallback(() => {
      if (!enSellado) return undefined;
      const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
        setEnSellado(false);
        return true;
      });
      return () => suscripcion.remove();
    }, [enSellado]),
  );

  const elegir = (modo: 'date' | 'time') => {
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    DateTimePickerAndroid.open({
      value: momento,
      mode: modo,
      is24Hour: true,
      // Como la app vieja: hasta un mes atrás y nunca en el futuro.
      maximumDate: new Date(),
      minimumDate: haceUnMes,
      onChange: (evento, elegido) => {
        if (evento.type !== 'set' || !elegido) return;
        const nuevo = new Date(momento);
        if (modo === 'date') nuevo.setFullYear(elegido.getFullYear(), elegido.getMonth(), elegido.getDate());
        else nuevo.setHours(elegido.getHours(), elegido.getMinutes(), 0, 0);
        setMomento(nuevo);
        setMomentoElegido(true);
      },
    });
  };

  // Nada irreversible en un clic: se confirma con el número de embarque.
  const guardar = () => {
    if (!embarque || guardado.isPending) return;
    const nuevos = {
      custodia: custodia.trim() ? undefined : 'Escriba quién custodia el contenedor.',
      placas: placas.trim() ? undefined : 'Escriba las placas de la custodia.',
    };
    setErrores(nuevos);
    if (nuevos.custodia || nuevos.placas) return;
    Alert.alert('Guardar sellado', `Va a registrar la salida del embarque ${embarque.numero}, contenedor ${embarque.contenedor ?? '—'}.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Guardar', onPress: () => guardado.mutate(embarque) },
    ]);
  };

  let pie: React.ReactNode = null;
  if (embarque && enSellado) {
    pie = (
      <View style={styles.botones}>
        <View style={{ flex: 2 }}>
          <Button label="Atrás" variant="secondary" onPress={() => setEnSellado(false)} disabled={guardado.isPending} />
        </View>
        <View style={{ flex: 3 }}>
          <Button label={guardado.isPending ? 'Guardando…' : 'Guardar sellado…'} onPress={guardar} disabled={guardado.isPending} />
        </View>
      </View>
    );
  } else if (embarque) {
    pie = (
      <View style={styles.botones}>
        <View style={{ flex: 2 }}>
          <Button label="Limpiar" variant="secondary" onPress={limpiar} />
        </View>
        <View style={{ flex: 3 }}>
          <Button label="Ir al sellado" icon="arrow-right" onPress={irAlSellado} />
        </View>
      </View>
    );
  }

  return (
    <Screen
      header={
        <Header
          title={embarque ? `Embarque ${embarque.numero}` : 'Salida de exportación'}
          overline="Salidas · Exportación"
          navigation={
            <HeaderButton icon="chevron-left" accessibilityLabel="Volver" onPress={enSellado ? () => setEnSellado(false) : () => navigation.goBack()} />
          }
        >
          {/* «1 · Datos  2 · Sellado»: deja ver que hay un segundo paso. El actual va relleno. */}
          <View style={styles.pasos}>
            <Paso texto="1 · Datos" actual={!enSellado} />
            <Paso texto="2 · Sellado" actual={enSellado} />
          </View>
        </Header>
      }
      footer={pie}
    >
      {aviso ? <Banner tone={aviso.tono} message={aviso.texto} /> : null}
      {embarque && enSellado ? (
        <>
          <Card padding={3}>
            <Text type="mono">{embarque.contenedor ?? 'Sin contenedor'}</Text>
            <Text type="bodySm" color="textMuted">
              {[embarque.destino, embarque.sellos[0] ? `sello ${embarque.sellos[0]}` : null].filter(Boolean).join(' · ') || '—'}
            </Text>
          </Card>
          <View style={styles.fila}>
            <View style={styles.mitad}>
              <Selector rotulo="Fecha" valor={fechaCorta(momento)} onPress={() => elegir('date')} disabled={guardado.isPending} />
            </View>
            <View style={styles.mitad}>
              <Selector rotulo="Hora de sellado" valor={`${dos(momento.getHours())}:${dos(momento.getMinutes())}`} onPress={() => elegir('time')} disabled={guardado.isPending} />
            </View>
          </View>
          <Text type="bodySm" color="textMuted">
            Llegan con la hora actual; cámbielas solo si el sellado fue antes.
          </Text>
          <TextField
            label="Custodia"
            value={custodia}
            onChangeText={v => {
              setCustodia(v);
              setErrores(e => ({ ...e, custodia: undefined }));
            }}
            placeholder="Nombre del custodio"
            autoCapitalize="words"
            error={errores.custodia}
            editable={!guardado.isPending}
            returnKeyType="next"
          />
          <TextField
            label="Placas de la custodia"
            value={placas}
            onChangeText={v => {
              setPlacas(v);
              setErrores(e => ({ ...e, placas: undefined }));
            }}
            placeholder="Ej. GSA-1234"
            autoCapitalize="characters"
            error={errores.placas}
            editable={!guardado.isPending}
            returnKeyType="next"
          />
          <TextField label="Observaciones" value={observaciones} onChangeText={setObservaciones} placeholder="Opcional" editable={!guardado.isPending} />
        </>
      ) : embarque ? (
        <DatosEmbarque embarque={embarque} />
      ) : (
        <>
          <ScanPrompt
            title={busqueda.isPending ? 'Consultando el embarque…' : 'Busque el embarque'}
            message="Escriba el número de embarque para ver su contenedor y registrar el sellado."
            icon="ship"
            compact={!!aviso}
          />
          <TextField
            label="N° de embarque"
            value={texto}
            onChangeText={setTexto}
            placeholder="Ej. 4521"
            autoCapitalize="characters"
            editable={!busqueda.isPending}
            returnKeyType="search"
            onSubmitEditing={buscar}
          />
          <Button
            label={busqueda.isPending ? 'Consultando…' : 'Buscar embarque'}
            variant="secondary"
            icon="search"
            onPress={buscar}
            disabled={busqueda.isPending || !texto.trim()}
          />
        </>
      )}
    </Screen>
  );
}

function Paso({ texto, actual }: { texto: string; actual: boolean }) {
  const styles = useStyles();
  if (!actual) return <TypeTag text={texto} onBrand />;
  return (
    <View style={styles.pasoActual}>
      <Text type="tag" color="brand">
        {texto}
      </Text>
    </View>
  );
}

/** Contenedor, placa y conductor arriba: es lo que se compara con el camión. */
function DatosEmbarque({ embarque }: { embarque: Embarque }) {
  return (
    <Card padding={3} gap={3}>
      <HighlightBox title="Compara con el camión">
        <View>
          <Text type="label" color="textMuted">
            Contenedor
          </Text>
          <Text type="numMd">{embarque.contenedor ?? '—'}</Text>
        </View>
        <Datos>
          <Dato rotulo="Placa" valor={embarque.placa} mono enFila />
          <Dato rotulo="Conductor" valor={embarque.conductor} enFila />
        </Datos>
      </HighlightBox>
      <TypeTags texts={[...(embarque.destino ? [embarque.destino] : []), ...embarque.sellos.map(s => `Sello ${s}`)]} />
      <Datos>
        <Dato rotulo="Factura" valor={embarque.factura} mono enFila />
        <Dato rotulo="Masters" valor={embarque.masters} mono enFila />
      </Datos>
      <Datos>
        <Dato rotulo="Producto" valor={embarque.producto} enFila />
        <Dato rotulo="Naviera" valor={embarque.naviera} enFila />
      </Datos>
    </Card>
  );
}
