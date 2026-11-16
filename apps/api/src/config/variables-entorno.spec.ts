import { duracionEnSegundos, Entorno, validarEntorno } from './variables-entorno.js';

const minimas = {
  CORS_ORIGIN: 'http://localhost:4200',
  DB_HOST: 'localhost',
  DB_USER: 'usuario',
  DB_PASSWORD: 'clave',
  DB_NAME: 'agroprecios',
  JWT_SECRET: 'x'.repeat(32),
};

describe('duracionEnSegundos', () => {
  it('convierte duraciones con unidad', () => {
    expect(duracionEnSegundos('15m')).toBe(900);
    expect(duracionEnSegundos('1h')).toBe(3600);
    expect(duracionEnSegundos('30s')).toBe(30);
    expect(() => duracionEnSegundos('15 minutos')).toThrow();
  });
});

describe('validarEntorno', () => {
  it('aplica valores por defecto y convierte números', () => {
    const env = validarEntorno({ ...minimas, DB_PORT: '5433' });
    expect(env.NODE_ENV).toBe(Entorno.Desarrollo);
    expect(env.PORT).toBe(3000);
    expect(env.DB_PORT).toBe(5433);
    expect(env.THROTTLE_LIMIT).toBe(120);
    expect(env.JWT_EXPIRES_IN).toBe('15m');
    expect(env.INGESTA_PROGRAMADA).toBe(true);
  });

  it('interpreta INGESTA_PROGRAMADA=false', () => {
    expect(validarEntorno({ ...minimas, INGESTA_PROGRAMADA: 'false' }).INGESTA_PROGRAMADA).toBe(
      false,
    );
  });

  it('falla si falta una variable obligatoria', () => {
    const { DB_HOST: _omitida, ...sinHost } = minimas;
    expect(() => validarEntorno(sinHost)).toThrow(/DB_HOST/);
  });

  it('exige un JWT_SECRET largo', () => {
    expect(() => validarEntorno({ ...minimas, JWT_SECRET: 'corto' })).toThrow(/JWT_SECRET/);
  });

  it('rechaza un JWT_EXPIRES_IN mal formado', () => {
    expect(() => validarEntorno({ ...minimas, JWT_EXPIRES_IN: '15 minutos' })).toThrow(
      /JWT_EXPIRES_IN/,
    );
  });

  it('rechaza un ADMIN_PASSWORD corto', () => {
    expect(() => validarEntorno({ ...minimas, ADMIN_PASSWORD: 'corta' })).toThrow(/ADMIN_PASSWORD/);
  });

  it('rechaza un puerto inválido', () => {
    expect(() => validarEntorno({ ...minimas, PORT: '99999' })).toThrow(/PORT/);
  });
});
