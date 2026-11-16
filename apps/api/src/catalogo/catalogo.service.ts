import {
  type EstadoIngesta,
  type Frecuencia,
  type FuenteDto,
  type ProductoDto,
  type TipoFuente,
} from '@agroprecios/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Producto } from './entities/producto.entity.js';
import { calcularEstadoFuente } from './estado-fuente.js';

interface FilaFuente {
  slug: string;
  nombre: string;
  tipo: TipoFuente;
  url: string | null;
  licencia: string | null;
  frecuencia: Frecuencia;
  ultima_exitosa: Date | null;
  ultimo_estado: EstadoIngesta | null;
}

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(Producto) private readonly productos: Repository<Producto>,
    private readonly dataSource: DataSource,
  ) {}

  async listarProductos(): Promise<ProductoDto[]> {
    const productos = await this.productos.find({ where: { activo: true }, order: { id: 'ASC' } });
    return productos.map(({ slug, nombre, descripcion, unidadBase }) => ({
      slug,
      nombre,
      descripcion,
      unidadBase,
    }));
  }

  /** Fuentes activas con su última ingesta exitosa y su estado (RF-06). */
  async listarFuentes(ahora = new Date()): Promise<FuenteDto[]> {
    const filas = await this.dataSource.query<FilaFuente[]>(`
      SELECT f.slug, f.nombre, f.tipo, f.url, f.licencia, f.frecuencia,
             exitosa.fin   AS ultima_exitosa,
             ultima.estado AS ultimo_estado
      FROM fuente f
      LEFT JOIN LATERAL (
        SELECT max(e.fin) AS fin
        FROM ingesta_ejecucion e
        WHERE e.fuente_id = f.id AND e.estado = 'OK'
      ) exitosa ON true
      LEFT JOIN LATERAL (
        SELECT e.estado
        FROM ingesta_ejecucion e
        WHERE e.fuente_id = f.id AND e.estado <> 'EN_CURSO'
        ORDER BY e.inicio DESC
        LIMIT 1
      ) ultima ON true
      WHERE f.activo
      ORDER BY f.id
    `);

    return filas.map((fila) => ({
      slug: fila.slug,
      nombre: fila.nombre,
      tipo: fila.tipo,
      url: fila.url,
      licencia: fila.licencia,
      frecuencia: fila.frecuencia,
      ultimaIngestaExitosa: fila.ultima_exitosa?.toISOString() ?? null,
      estado: calcularEstadoFuente(
        {
          tipo: fila.tipo,
          frecuencia: fila.frecuencia,
          ultimaIngestaExitosa: fila.ultima_exitosa,
          ultimoEstado: fila.ultimo_estado,
        },
        ahora,
      ),
    }));
  }
}
