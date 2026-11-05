import { binesDe, camposMovimiento, guardado, guiasVisibles, leerValidacion, numeroRemision, tagCorto, tipoInicial } from '../reglas';

const linea = (descripcion: string, cantidad: string) => ({ descripcion, cantidad, unidad: 'UND' });

describe('bines de una guía', () => {
  const detalle = [linea('BIN PLASTICO', '24.00'), linea('GAVETAS', '10'), linea('BINES AZULES', '6')];

  it('cuenta solo las líneas de bines en las series comunes', () => {
    expect(binesDe('001002', 1, 1, detalle)).toBe(30);
  });

  it('cuenta todas las líneas en las series 024006 y 024010', () => {
    expect(binesDe('024006', 1, 1, detalle)).toBe(40);
    expect(binesDe('024010', null, null, detalle)).toBe(40);
  });

  it('aplica las reglas de la serie 001007 según motivo y tipo', () => {
    expect(binesDe('001007', 5, 5, detalle)).toBe(30);
    expect(binesDe('001007', 5, 3, detalle)).toBe(40);
    expect(binesDe('001007', 2, 2, detalle)).toBe(0);
  });
});

describe('guías visibles', () => {
  const guia = (extra: object) => ({
    numeroserie: '001002',
    guia_remision: '000120',
    co_motivo: 1,
    co_tipo_g: 2,
    detalle_guia_remision: [{ descripcion: 'BIN', cantidad: '24.00' }],
    ...extra,
  });

  it('oculta las que no tienen detalle y las que tienen otro movimiento', () => {
    const visibles = guiasVisibles([
      guia({}),
      guia({ guia_remision: '000121', activo: '1' }),
      guia({ guia_remision: '000122', activo: '2' }),
      guia({ guia_remision: '000123', detalle_guia_remision: [] }),
      guia({}),
    ]);
    expect(visibles.map(g => [g.numero, g.registrada, g.bines])).toEqual([
      ['000120', false, 24],
      ['000121', true, 24],
    ]);
  });

  it('limpia los «null» que manda el ERP', () => {
    expect(guiasVisibles([guia({ placa: 'null', Chofer: '  LUIS  ' })])[0]).toMatchObject({ placa: null, conductor: 'LUIS' });
  });
});

describe('guardar el movimiento', () => {
  const validacion = leerValidacion({
    tags_OK: [{ codigo_tag: 'E1', id_bin: 1 }, { codigo_tag: 'E9', id_bin: 9 }],
    tags_response: [
      { status_save: 'OK', codigo_tag: 'E1' },
      { status_save: 'NR', codigo_tag: 'E2' },
      { status_save: 'SS', codigo_tag: 'E3' },
    ],
  });

  it('manda los válidos que siguen en la lista y anota los demás con su código', () => {
    const campos = camposMovimiento({ guia: '000120', ingreso: false, totalManual: 2, observaciones: ' ok ' }, validacion, ['e1', 'E2', 'E3'], '88', 4, '1');
    expect(campos).toMatchObject({ co_planta: '1', tipo: 'E', numMov: '88', guia: '000120', tipo_guia: 'EP', id_clase_mov: '4', tot_man: '2', sellos: 'null', observaciones: 'ok' });
    expect(JSON.parse(campos.tags_validos)).toEqual([
      { codigo_tag: 'E1', id_bin: 1 },
      { status_save: 'NR', codigo_tag: 'E2' },
      { status_save: 'SS', codigo_tag: 'E3' },
    ]);
  });

  it('cuenta como guardado el 404 «Error al actualizar estado» de guardarConfig', () => {
    expect(guardado({ status: 200 })).toBe(true);
    expect(guardado({ status: 404, msg: 'Error al actualizar estado!!!' })).toBe(true);
    expect(guardado({ status: 404, msg: 'Guía no existe' })).toBe(false);
    expect(guardado({ status: 400 })).toBe(false);
  });
});

describe('formato', () => {
  it('escribe la guía como se imprime', () => {
    expect(numeroRemision('001007', '000123')).toBe('001-007-000123');
  });

  it('acorta el EPC a los últimos 8 caracteres', () => {
    expect(tagCorto('E2801170000002134118A06')).toBe('…3411 8A06');
    expect(tagCorto('ABC')).toBe('ABC');
  });

  it('elige al abrir el segundo tipo, como la app vieja', () => {
    expect(tipoInicial({ tipos: [{ codigo: 1, nombre: 'A' }, { codigo: 2, nombre: 'B' }], motivos: [] })?.codigo).toBe(2);
    expect(tipoInicial({ tipos: [{ codigo: 1, nombre: 'A' }], motivos: [] })?.codigo).toBe(1);
  });
});
