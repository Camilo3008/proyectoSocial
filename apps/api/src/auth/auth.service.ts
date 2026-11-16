import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioAdmin } from './entities/usuario-admin.entity.js';

/**
 * Autenticación del único rol de la Fase 1 (ADMIN) con JWT de corta duración.
 * Se implementa junto con el panel de administración (RF-07).
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UsuarioAdmin) protected readonly usuarios: Repository<UsuarioAdmin>,
  ) {}
}
