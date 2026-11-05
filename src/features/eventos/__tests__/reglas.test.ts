import { enCamaronera, esDesconocida, evento, GRUPOS, nombreEvento, permiteSinPesca, siglaDe } from '../catalogo';
import { esGuia, fechaHoraLocal, horaDe, motivoRechazo, textoBoton, textoRegistrado, vehiculoPrimero } from '../reglas';

const e = (id: number) => evento(id)!;

describe('catálogo de eventos', () => {
  it('tiene los 19 eventos con guía de movilización', () => {
    expect(GRUPOS.flatMap(g => g.eventos)).toHaveLength(19);
  });

  it('manda I o E según el tipo de movimiento', () => {
    expect(siglaDe(e(1010))).toBe('I');
    expect(siglaDe(e(1020))).toBe('E');
    expect(siglaDe(e(1080))).toBe('E');
  });

  it('numera en la camaronera los mismos de `$en_camaronera` del backend', () => {
    expect([1025, 1035, 1030, 1040, 1070, 1080].every(id => enCamaronera(e(id)))).toBe(true);
    expect([1010, 1000, 1050, 1090, 1110].some(id => enCamaronera(e(id)))).toBe(false);
  });

  it('solo la salida de garita camaronera puede salir sin pesca', () => {
    expect(permiteSinPesca(e(1040))).toBe(true);
    expect(permiteSinPesca(e(1030))).toBe(false);
    expect(permiteSinPesca(e(1020))).toBe(false);
  });

  it('no trata como desconocidas el Dashboard ni las opciones retiradas', () => {
    expect(esDesconocida(10304)).toBe(false);
    expect(esDesconocida(10306)).toBe(false);
    expect(esDesconocida(1010)).toBe(false);
    expect(esDesconocida(10320)).toBe(false);
    expect(esDesconocida(99999)).toBe(true);
  });

  it('nombra el evento con su grupo', () => {
    expect(nombreEvento(e(1035))).toBe('Llegada a camaronera · Con pesca');
  });
});

describe('número de guía', () => {
  it.each(['GM0004512', 'G0004512', 'GM10004512', 'gm0004512', ' GM0004512 '])('acepta %p', guia => {
    expect(esGuia(guia)).toBe(true);
  });

  it.each(['', '0004512', 'GMX0004512', 'GM00045', 'GM0004512A'])('rechaza %p', guia => {
    expect(esGuia(guia)).toBe(false);
  });
});

describe('textos de la captura', () => {
  it('nombra el botón principal según el evento', () => {
    expect(textoBoton(e(1010))).toBe('Registrar ingreso');
    expect(textoBoton(e(1080))).toBe('Registrar fin');
    expect(textoBoton(e(1035))).toBe('Registrar llegada');
    expect(textoRegistrado(e(1035))).toBe('Llegada registrada');
    expect(textoRegistrado(e(1020))).toBe('Salida registrado');
  });

  it('pone primero chofer y vehículo en garitas y los datos de pesca en pesca, calidad y llegadas con pesca', () => {
    expect(vehiculoPrimero(e(1010))).toBe(true);
    expect(vehiculoPrimero(e(1062))).toBe(true);
    expect(vehiculoPrimero(e(1025))).toBe(true);
    expect(vehiculoPrimero(e(1035))).toBe(false);
    expect(vehiculoPrimero(e(1070))).toBe(false);
    expect(vehiculoPrimero(e(1090))).toBe(false);
    expect(vehiculoPrimero(e(1110))).toBe(false);
  });
});

describe('motivo de rechazo', () => {
  it('explica el duplicado genérico', () => {
    expect(motivoRechazo('Movimiento Duplicado')).toMatch(/último movimiento/);
  });

  it('explica los duplicados por dirección', () => {
    expect(motivoRechazo('Movimiento Control de Calidad Duplicado', 'ingreso')).toBe('Esta guía ya tiene registrado el ingreso de análisis de calidad.');
    expect(motivoRechazo('movimiento despacho de meta duplicado', 'salida')).toBe('Esta guía ya tiene registrada la salida de despacho de meta.');
    expect(motivoRechazo('Movimiento Planta Hielo Duplicado')).toBe('Esta guía ya tiene registrado este movimiento de garita interna.');
  });

  it('pide registrar primero el ingreso', () => {
    expect(motivoRechazo('No se ha disparado un INGRESO previo')).toMatch(/Registre primero el ingreso/);
  });

  it('no muestra textos técnicos del servidor', () => {
    expect(motivoRechazo('SQLSTATE[23000]: Integrity constraint violation')).toBe('El registro no fue aceptado. Comuníquese con Sistemas.');
    expect(motivoRechazo(null)).toBe('El registro no fue aceptado. Comuníquese con Sistemas.');
  });
});

describe('fechas', () => {
  it('arma la fecha local en 24 horas', () => {
    expect(fechaHoraLocal(new Date(2026, 10, 3, 14, 5, 9))).toBe('2026-11-03 14:05:09');
    expect(horaDe('2026-11-03 14:05:09')).toBe('14:05');
  });
});
