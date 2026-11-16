import { type DetallePaisDto, type MapaPaisesDto, type PaisPrecioDto } from '@agroprecios/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { Pais } from '../catalogo/entities/pais.entity.js';
import { Producto } from '../catalogo/entities/producto.entity.js';
import { citaDe } from '../common/citas.js';
import { calcularVariacion } from '../common/decimal.js';

const FUENTE_PAISES = 'faostat';
const ISO_COLOMBIA = 'COL';

interface FilaPais {
  iso3: string;
  iso2: string | null;
  nombre: string;
  anio: number;
  presentacion: string;
  usd_t: string;
  usd_kg: string;
  cop_kg: string | null;
  local: string | null;
  bandera: string | null;
}

const aDto = (f: FilaPais): PaisPrecioDto => ({
  iso3: f.iso3,
  iso2: f.iso2,
  nombre: f.nombre,
  valorUsdKg: f.usd_kg,
  valorUsdT: f.usd_t,
  valorMonedaLocalT: f.local,
  valorCopKg: f.cop_kg,
  bandera: f.bandera,
});

/** Precio al productor por país (FAOSTAT) para el globo (RF-05). */
@Injectable()
export class PaisesService {
  constructor(
    @InjectRepository(Producto) private readonly productos: Repository<Producto>,
    @InjectRepository(Fuente) private readonly fuentes: Repository<Fuente>,
    @InjectRepository(Pais) private readonly paises: Repository<Pais>,
    private readonly dataSource: DataSource,
  ) {}

  private async contexto(slugProducto: string) {
    const producto = await this.productos.findOneBy({ slug: slugProducto, activo: true });
    if (!producto) throw new NotFoundException(`El producto "${slugProducto}" no existe`);
    const fuente = await this.fuentes.findOneBy({ slug: FUENTE_PAISES });
    if (!fuente) throw new NotFoundException('La fuente FAOSTAT no está registrada');
    return { producto, fuente };
  }

  /** Filas por país con todos los campos que necesita el globo. */
  private filas(productoId: number, fuenteId: number, filtro: string, parametros: unknown[]) {
    return this.dataSource.query<FilaPais[]>(
      `SELECT o.pais_iso3 AS iso3, p.iso2, p.nombre_es AS nombre,
              EXTRACT(YEAR FROM o.fecha)::int AS anio, o.presentacion,
              o.valor::text AS usd_t, o.valor_usd_kg::text AS usd_kg, o.valor_cop_kg::text AS cop_kg,
              o.metadata->>'valorMonedaLocal' AS local, o.metadata->>'bandera' AS bandera
       FROM observacion_precio o
       JOIN pais p ON p.iso3 = o.pais_iso3
       WHERE o.producto_id = $1 AND o.fuente_id = $2 AND o.anulado = false
         AND o.periodicidad = 'ANUAL' AND o.pais_iso3 IS NOT NULL ${filtro}`,
      [productoId, fuenteId, ...parametros],
    );
  }

  async mapa(slugProducto: string, anioPedido?: number): Promise<MapaPaisesDto> {
    const { producto, fuente } = await this.contexto(slugProducto);
    const anios = await this.dataSource.query<{ anio: number }[]>(
      `SELECT DISTINCT EXTRACT(YEAR FROM fecha)::int AS anio FROM observacion_precio
       WHERE producto_id = $1 AND fuente_id = $2 AND anulado = false AND pais_iso3 IS NOT NULL
       ORDER BY 1 DESC`,
      [producto.id, fuente.id],
    );
    const aniosDisponibles = anios.map((a) => a.anio);
    const anio = anioPedido ?? aniosDisponibles[0] ?? null;
    const filas =
      anio === null
        ? []
        : await this.filas(
            producto.id,
            fuente.id,
            `AND o.fecha = make_date($3, 1, 1) ORDER BY o.valor_usd_kg DESC, p.nombre_es`,
            [anio],
          );
    return {
      producto: { slug: producto.slug, nombre: producto.nombre },
      fuente: { slug: fuente.slug, nombre: fuente.nombre, cita: citaDe(fuente.slug) },
      presentacion: filas[0]?.presentacion ?? null,
      anio: filas.length > 0 ? anio : null,
      aniosDisponibles,
      items: filas.map(aDto),
    };
  }

  async detalle(iso3: string, slugProducto: string): Promise<DetallePaisDto> {
    const { producto, fuente } = await this.contexto(slugProducto);
    const pais = await this.paises.findOneBy({ iso3 });
    if (!pais) throw new NotFoundException(`El país "${iso3}" no existe`);

    const [serie, colombia] = await Promise.all([
      this.filas(producto.id, fuente.id, 'AND o.pais_iso3 = $3 ORDER BY o.fecha', [iso3]),
      this.filas(producto.id, fuente.id, 'AND o.pais_iso3 = $3 ORDER BY o.fecha', [ISO_COLOMBIA]),
    ]);
    const ultimo = serie.at(-1) ?? null;
    const colombiaMismoAnio = ultimo ? colombia.find((c) => c.anio === ultimo.anio) : undefined;

    return {
      pais: { iso3: pais.iso3, iso2: pais.iso2, nombre: pais.nombreEs, region: pais.region },
      producto: { slug: producto.slug, nombre: producto.nombre },
      fuente: { slug: fuente.slug, nombre: fuente.nombre, cita: citaDe(fuente.slug) },
      presentacion: ultimo?.presentacion ?? null,
      serie: serie.map((f) => ({ anio: f.anio, valorUsdKg: f.usd_kg, valorCopKg: f.cop_kg })),
      ultimo: ultimo ? { ...aDto(ultimo), anio: ultimo.anio } : null,
      comparacionColombia:
        ultimo && colombiaMismoAnio && iso3 !== ISO_COLOMBIA
          ? {
              anio: ultimo.anio,
              valorColombiaUsdKg: colombiaMismoAnio.usd_kg,
              diferenciaPct: calcularVariacion(ultimo.usd_kg, colombiaMismoAnio.usd_kg).porcentaje,
            }
          : null,
    };
  }
}
