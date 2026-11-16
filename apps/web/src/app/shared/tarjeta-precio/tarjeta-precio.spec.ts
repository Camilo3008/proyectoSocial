import { type PrecioHoyItemDto } from '@agroprecios/shared';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TarjetaPrecio } from './tarjeta-precio';

// DATO DE EJEMPLO: valores con la forma de los reales, solo para pruebas.
const CAFE: PrecioHoyItemDto = {
  producto: { slug: 'cafe', nombre: 'Café' },
  fuente: { slug: 'fnc', nombre: 'Federación Nacional de Cafeteros', cita: null },
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
      fuente: { slug: 'fnc', nombre: 'Federación Nacional de Cafeteros', cita: null },
      mercado: { id: 1, nombre: 'Bolsa de Nueva York (ICE)' },
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
    await TestBed.configureTestingModule({
      imports: [TarjetaPrecio],
      providers: [provideRouter([])],
    }).compileComponents();
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

  it('muestra el mercado, la cita del DANE, la advertencia de mayorista y los enlaces', async () => {
    await montar(
      {
        ...CAFE,
        producto: { slug: 'banano', nombre: 'Banano' },
        fuente: {
          slug: 'sipsa',
          nombre: 'DANE – SIPSA (precios mayoristas)',
          cita: 'Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co',
        },
        mercado: { id: 7, nombre: 'Neiva, Surabastos' },
        presentacion: 'banano',
        valor: '2200.0000',
        unidad: 'kg',
        complementos: [],
      },
      '2026-11-13',
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Banano');
    // Intl usa un espacio no separable entre "$" y el número.
    expect(el.querySelector('.precio__valor')?.textContent?.replace(/\s/g, ' ')).toBe('$ 2.200');
    expect(el.querySelector('.precio__unidad')?.textContent).toBe('por kilo');
    expect(texto()).toContain(
      'DANE – SIPSA (precios mayoristas) · Neiva, Surabastos · 13 nov 2026',
    );
    expect(texto()).toContain(
      'Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co',
    );
    expect(texto()).toContain('no es lo que recibe el productor');
    const enlaces = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(enlaces).toEqual([
      '/historico?producto=banano&fuente=sipsa&presentacion=banano&mercado=7',
      '/nacional?producto=banano&presentacion=banano',
    ]);
  });
});
