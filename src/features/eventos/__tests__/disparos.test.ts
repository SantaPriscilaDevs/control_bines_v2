import { aDisparo, camposRegistro, idPlantaDe } from '../disparos';
import { evento } from '../catalogo';

// Jest lo sube antes de los imports: las pruebas no abren la base local.
jest.mock('@/lib/storage/baseDatos', () => ({ baseDatos: jest.fn(), avisarCambio: jest.fn() }));

const momento = new Date(2026, 10, 3, 10, 42, 15);
const camaronera = { id: 77, nombre: 'CABALA I' };

describe('registro de un evento', () => {
  it('arma los campos de guardar-trazabilidad-guia con los valores fijos de la app vieja', () => {
    const d = aDisparo({ evento: evento(1010)!, guia: ' gm0004512 ', coPlanta: '1', camaronera: null, sinPesca: true }, momento, 'Pendiente');
    expect(camposRegistro(d, 2064)).toEqual({
      guia: 'GM0004512',
      numMov: '2064',
      tipo: 'I',
      co_planta: '1',
      tipo_transaccion: 'GAR',
      co_camaronera: '0',
      observaciones: 'Trazabilidad de Garita Planta',
      id_clase_mov: '1',
      externo: '1',
      tot_man: '0',
      tipo_guia: 'P',
      tags_validos: '[]',
      // Solo la salida de garita camaronera puede ir sin pesca.
      sin_pesca: '0',
    });
    expect(d.fechaHora).toBe('2026-11-03 10:42:15');
    expect(d.dia).toBe('2026-11-03');
  });

  it('guarda la camaronera y sin pesca en la salida de garita camaronera', () => {
    const d = aDisparo({ evento: evento(1040)!, guia: 'GM1', coPlanta: '1', camaronera, sinPesca: true }, momento, 'Pendiente');
    expect(d.coCamaronera).toBe(77);
    expect(d.nombreCamaronera).toBe('CABALA I');
    expect(camposRegistro(d, 5).sin_pesca).toBe('1');
  });

  it('numera con la secuencia de la camaronera solo en los eventos de camaronera', () => {
    const enCam = aDisparo({ evento: evento(1035)!, guia: 'GM1', coPlanta: '1', camaronera, sinPesca: false }, momento, 'Pendiente');
    const enPlanta = aDisparo({ evento: evento(1010)!, guia: 'GM1', coPlanta: '1', camaronera, sinPesca: false }, momento, 'Pendiente');
    expect(idPlantaDe(enCam)).toBe('77');
    expect(idPlantaDe(enPlanta)).toBe('1');
    expect(enPlanta.coCamaronera).toBe(0);
  });
});
