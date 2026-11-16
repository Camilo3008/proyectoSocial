import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObservacionPrecio } from './entities/observacion-precio.entity.js';

/**
 * Consultas de precios: precio del día, series y comparativos.
 * Se implementa a partir de la Etapa 1 (GET /api/precios/hoy).
 */
@Injectable()
export class PreciosService {
  constructor(
    @InjectRepository(ObservacionPrecio)
    protected readonly observaciones: Repository<ObservacionPrecio>,
  ) {}
}
