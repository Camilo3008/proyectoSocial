import { type PrecioHoyItemDto } from '@agroprecios/shared';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { TarjetaPrecio } from './tarjeta-precio';

// DATO DE EJEMPLO: valores con la forma de los reales, solo para pruebas.
const CAFE: PrecioHoyItemDto = {
  producto: { slug: 'cafe', nombre: 'Café' },
  fuente: { slug: 'fnc', nombre: 'Federación Nacional de Cafeteros' },
  mercado: null,
  fecha: '2026-11-13',
  presentacion: 'pergamino seco',
  valor: '2075000.0000',
  moneda: 'COP',
  unidad: 'carga 125 kg',
  valorCopKg: '16600.0000',
  variacion: { absoluta: '25000.0000', porcentaje: '1.22', fechaAnterior: '2026-11-12' },
  complementos: [
    {
      etiqueta: 'Bolsa de Nueva York',
      fuente: { slug: 'fnc', nombre: 'Federación Nacional de Cafeteros' },
      mercado: { nombre: 'Bolsa de Nueva York (ICE)' },
      fecha: '2026-11-13',
      presentacion: 'verde arábica (contrato C)',
      valor: '278.6500',
      moneda: 'USD',
      unidad: 'USc/lb',
      valorCopKg: null,
      variacion: null,
    },
  ],
};

describe('TarjetaPrecio', () => {
  let fixture: ComponentFixture<TarjetaPrecio>;
  const texto = () =>
    ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

  async function montar(item: PrecioHoyItemDto, hoy: string) {
    await TestBed.configureTestingModule({ imports: [TarjetaPrecio] }).compileComponents();
    fixture = TestBed.createComponent(TarjetaPrecio);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('hoy', hoy);
    await fixture.whenStable();
  }

  it('muestra precio sin decimales, unidad, variación, fuente y fecha', async () => {
    await montar(CAFE, '2026-11-13');
    expect(texto()).toContain('Café pergamino seco');
    expect(texto()).toContain('$ 2.075.000');
    expect(texto()).toContain('por carga de 125 kg');
    expect(texto()).toContain('▲ Subió 1,22 % frente al 12 nov 2026');
    expect(texto()).toContain('Fuente: Federación Nacional de Cafeteros · 13 nov 2026');
    expect(texto()).not.toContain('Último dato disponible');
  });

  it('muestra el complemento de Nueva York con la advertencia de comparabilidad', async () => {
    await montar(CAFE, '2026-11-13');
    expect(texto()).toContain(
      'Bolsa de Nueva York: 278,65 centavos de dólar por libra · 13 nov 2026',
    );
    expect(texto()).toContain('no se comparan directamente');
  });

  it('resalta cuando el dato no es del día', async () => {
    await montar(CAFE, '2026-11-16');
    expect(texto()).toContain('Último dato disponible: Fuente: Federación Nacional de Cafeteros');
  });

  it('indica bajadas y omite la variación si no hay dato anterior', async () => {
    await montar(
      {
        ...CAFE,
        variacion: { absoluta: '-50000.0000', porcentaje: '-2.44', fechaAnterior: '2026-11-12' },
      },
      '2026-11-13',
    );
    expect(texto()).toContain('▼ Bajó 2,44 % frente al 12 nov 2026');
    expect((fixture.nativeElement as HTMLElement).querySelector('.variacion--baja')).not.toBeNull();

    fixture.componentRef.setInput('item', { ...CAFE, variacion: null, complementos: [] });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.variacion')).toBeNull();
    expect(texto()).not.toContain('no se comparan');
  });
});
