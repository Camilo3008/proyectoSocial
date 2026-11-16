import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TasaCambio } from './entities/tasa-cambio.entity.js';

/**
 * TRM y conversión de monedas. Se implementa en la Etapa 1 (adapter TRM).
 * Las conversiones usan aritmética decimal, nunca `number`.
 */
@Injectable()
export class TasasService {
  constructor(@InjectRepository(TasaCambio) protected readonly tasas: Repository<TasaCambio>) {}
}
