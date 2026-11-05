import { mensajeLogin, mensajePlanta } from '@/features/sesion/mensajes';
import { cedulaDelQr, esGuiaVirtual } from '@/features/consultas/servicio';
import { camposSellado, mensajeEmbarque } from '@/features/exportacion/servicio';
import { configuracionRfid, RFID_CONTINUA } from '@/hardware';
import { formulario, normalizar } from '../cliente';
import { comprobar, ErrorApi, exito, mensajeDelCuerpo, motivoDe } from '../errores';

describe('errores del servidor', () => {
  it('toma el motivo de message, cause o msg', () => {
    expect(mensajeDelCuerpo({ error: true, message: 'Cédula no registrada' })).toBe('Cédula no registrada');
    expect(mensajeDelCuerpo('{"msg":"Error","cause":"Embarque ya registrado"}')).toBe('Embarque ya registrado');
    expect(mensajeDelCuerpo('<html>')).toBeUndefined();
    expect(mensajeDelCuerpo(null)).toBeUndefined();
  });

  it('sin respuesta es sin conexión', () => {
    expect(normalizar(new Error('Network Error')).tipo).toBe('sinConexion');
    expect(normalizar({ response: { status: 400, data: { message: 'No' } } })).toMatchObject({ tipo: 'http', codigo: 400, message: 'No' });
  });

  it('no muestra el texto técnico de un 500', () => {
    const error = ErrorApi.http(500, 'SQLSTATE[42S02]');
    expect(error.message).not.toMatch(/SQLSTATE/);
    expect(error.message).toMatch(/comuníquese con Sistemas\.$/i);
  });

  it('lee el resultado de los endpoints que responden 200 con el error dentro', () => {
    expect(exito({ status: 200 })).toBe(true);
    expect(motivoDe({ status: 400, msg: 'Error', error: {}, cause: 'Movimiento Duplicado' })).toBe('Movimiento Duplicado');
    expect(() => comprobar({ status: 400, msg: 'Error' })).toThrow('Error');
  });

  it('arma el formulario como la app vieja', () => {
    expect(formulario({ guia: 'GM 1', numMov: 3 })).toBe('guia=GM%201&numMov=3');
  });
});

describe('mensajes al usuario', () => {
  it('explica el login en tono formal', () => {
    expect(mensajeLogin(ErrorApi.http(404, 'Credenciales invalidas'))).toMatch(/^Sus credenciales no son correctas/);
    expect(mensajeLogin(ErrorApi.http(404, 'No tiene permiso para la aplicación'))).toMatch(/no tiene permiso.*Comuníquese con Sistemas\.$/);
    expect(mensajeLogin(ErrorApi.http(423))).toBe('Su usuario está desactivado. Comuníquese con Sistemas.');
    expect(mensajeLogin(ErrorApi.sinConexion())).toMatch(/Revise la conexión/);
    expect(mensajePlanta(ErrorApi.http(500))).toMatch(/comuníquese con Sistemas\.$/);
  });

  it('explica el embarque no encontrado o ya registrado', () => {
    expect(mensajeEmbarque('4521', 'N° Embarque no encontrado')).toMatch(/^No se encontró el embarque 4521/);
    expect(mensajeEmbarque('4521', 'Embarque ya registrado')).toBe('El embarque 4521 ya tiene registrada la salida.');
  });
});

describe('lecturas', () => {
  it('saca la cédula de los últimos 10 dígitos del QR del carné', () => {
    expect(cedulaDelQr('SANTA PRISCILA\nPEREZ LUIS\n0912345678')).toBe('0912345678');
    expect(cedulaDelQr('123')).toBeNull();
    expect(esGuiaVirtual(' 981 ')).toBe(true);
    expect(esGuiaVirtual('GV-981')).toBe(false);
  });

  it('toma la potencia y el modo del lector que manda el ERP', () => {
    expect(configuracionRfid(30, '255|4|0|0', RFID_CONTINUA)).toEqual({ potencia: 30, modo: [255, 4, 0, 0] });
    expect(configuracionRfid(undefined, '255,0,1,0', RFID_CONTINUA)).toEqual({ potencia: 33, modo: [255, 0, 1, 0] });
    expect(configuracionRfid('x', 'nada', RFID_CONTINUA)).toEqual(RFID_CONTINUA);
  });

  it('manda la hora de sellado sin segundos', () => {
    const embarque = { numero: '4521', contenedor: 'MSKU4821930', factura: null, conductor: null, placa: null, producto: null, masters: null, destino: null, naviera: null, sellos: [] };
    const campos = camposSellado(embarque, { momento: new Date(2026, 10, 2, 8, 40, 33), custodia: ' Juan ', placas: 'GSA-1', observaciones: '' }, '1');
    expect(campos).toMatchObject({ embarque: '4521', hora_sellado: '2026-11-02 08:40', custodia: 'Juan', tipo: 'E', tipo_guia: 'EX' });
  });
});
