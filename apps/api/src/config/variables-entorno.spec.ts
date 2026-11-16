import { Entorno, validarEntorno } from './variables-entorno.js';

const minimas = {
  CORS_ORIGIN: 'http://localhost:4200',
  DB_HOST: 'localhost',
  DB_USER: 'usuario',
  DB_PASSWORD: 'clave',
  DB_NAME: 'agroprecios',
};

describe('validarEntorno', () => {
  it('aplica valores por defecto y convierte números', () => {
    const env = validarEntorno({ ...minimas, DB_PORT: '5433' });
    expect(env.NODE_ENV).toBe(Entorno.Desarrollo);
    expect(env.PORT).toBe(3000);
    expect(env.DB_PORT).toBe(5433);
    expect(env.THROTTLE_LIMIT).toBe(120);
  });

  it('falla si falta una variable obligatoria', () => {
    const { DB_HOST: _omitida, ...sinHost } = minimas;
    expect(() => validarEntorno(sinHost)).toThrow(/DB_HOST/);
  });

  it('rechaza un ADMIN_PASSWORD corto', () => {
    expect(() => validarEntorno({ ...minimas, ADMIN_PASSWORD: 'corta' })).toThrow(/ADMIN_PASSWORD/);
  });

  it('rechaza un puerto inválido', () => {
    expect(() => validarEntorno({ ...minimas, PORT: '99999' })).toThrow(/PORT/);
  });
});
