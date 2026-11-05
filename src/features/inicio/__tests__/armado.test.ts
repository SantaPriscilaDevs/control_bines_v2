import { leerMenu, type OpcionMenu } from '@/features/sesion/menu';
import { evento } from '@/features/eventos/catalogo';
import { armarInicio, cantidadEventos, conMenu, iniciales, primerNombre, vacio } from '../armado';
import { fechaLarga, textoRepetir } from '../textos';

const opcion = (id: number, offline = false): OpcionMenu => ({ id, titulo: `Opción ${id}`, actividad: '', disponibleSinConexion: offline, json: {} });

describe('Inicio por rol', () => {
  // Usuario Guardia: llegada a planta sin pesca, garita planta e interna, más remisión, exportación y consultas.
  const guardia = [1000, 1010, 1020, 1050, 1060, 10304, 10320, 10321, 10322, 10314, 10315, 10313].map(id => opcion(id, id === 1010));

  it('agrupa los eventos en el orden del catálogo', () => {
    const inicio = armarInicio(guardia, true);
    expect(inicio.eventos.map(g => g.titulo)).toEqual(['Garita planta', 'Llegada a planta', 'Garita interna']);
    expect(cantidadEventos(inicio)).toBe(5);
  });

  it('manda al menú lateral las guías de remisión, la exportación y las consultas', () => {
    const inicio = armarInicio(guardia, true);
    expect(conMenu(inicio)).toBe(true);
    expect(inicio.secciones.map(s => s.modulo)).toEqual(['Salidas', 'Consultas']);
    expect(inicio.secciones[0].pares[0].accesos.map(a => a.titulo)).toEqual(['Salida', 'Ingreso']);
    expect(inicio.secciones[0].accesos.map(a => a.titulo)).toEqual(['Salida de exportación']);
    // El Dashboard y Visualizar guías (PDF) no aparecen.
    expect(inicio.otras).toEqual([]);
  });

  it('sin conexión solo habilita lo marcado offline', () => {
    const inicio = armarInicio(guardia, false);
    const botones = inicio.eventos.flatMap(g => g.botones);
    expect(botones.filter(b => b.habilitado).map(b => b.evento.id)).toEqual([1010]);
  });

  it('un rol sin opciones queda vacío', () => {
    expect(vacio(armarInicio([opcion(10304)], true))).toBe(true);
  });

  it('muestra aparte las opciones que no conoce', () => {
    expect(armarInicio([opcion(55555)], true).otras.map(o => o.opcion.id)).toEqual([55555]);
  });
});

describe('menú del ERP', () => {
  it('lee las opciones y descarta las que no tienen título', () => {
    const menu = leerMenu(JSON.stringify([{ id: '1010', title: 'Ingreso Garita', offline: true, uhf_power: 30 }, { id: 2, title: '' }, 'x']));
    expect(menu).toHaveLength(1);
    expect(menu[0]).toMatchObject({ id: 1010, titulo: 'Ingreso Garita', disponibleSinConexion: true });
    expect(menu[0].json.uhf_power).toBe(30);
    expect(leerMenu('no es json')).toEqual([]);
  });
});

describe('textos del Inicio', () => {
  it('saluda por el primer nombre', () => {
    expect(primerNombre('PEDRO SALAZAR')).toBe('Pedro');
    expect(iniciales('pedro  salazar ruiz')).toBe('PS');
  });

  it('nombra el botón para repetir como en el diseño', () => {
    expect(textoRepetir(evento(1010)!)).toBe('Otro ingreso en garita planta');
    expect(textoRepetir(evento(1040)!)).toBe('Otra salida de garita camaronera');
    expect(textoRepetir(evento(1035)!)).toBe('Otra llegada con pesca');
    expect(textoRepetir(evento(1090)!)).toBe('Otro ingreso a análisis de calidad');
    expect(textoRepetir(evento(1062)!)).toBe('Otra salida de despacho de meta');
  });

  it('escribe la fecha en español', () => {
    expect(fechaLarga(new Date(2026, 10, 3))).toBe('martes 3 de noviembre');
  });
});
