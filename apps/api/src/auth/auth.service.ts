import { randomUUID } from 'node:crypto';
import { type SesionDto } from '@agroprecios/shared';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UsuarioAdmin } from './entities/usuario-admin.entity.js';

/** Contenido del JWT del administrador. */
export interface PayloadJwt {
  sub: number;
  email: string;
  rol: 'ADMIN';
}

/** Usuario autenticado que queda en la petición. */
export interface UsuarioAutenticado {
  id: number;
  email: string;
}

// Hash bcrypt de un texto aleatorio (mismo costo que los reales): iguala el tiempo
// de respuesta cuando el correo no existe, para no revelar qué correos están registrados.
const HASH_SENUELO = bcrypt.hashSync(randomUUID(), 12);

const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos';

/** Autenticación del único rol de la Fase 1 (ADMIN) con JWT de corta duración. */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UsuarioAdmin) private readonly usuarios: Repository<UsuarioAdmin>,
    private readonly jwt: JwtService,
  ) {}

  async iniciarSesion(email: string, password: string): Promise<SesionDto> {
    const usuario = await this.usuarios.findOne({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, hashPassword: true, activo: true },
    });
    const coincide = await bcrypt.compare(password, usuario?.hashPassword ?? HASH_SENUELO);
    if (!usuario || !usuario.activo || !coincide) {
      throw new UnauthorizedException(MENSAJE_CREDENCIALES);
    }

    await this.usuarios.update(usuario.id, { ultimoAcceso: new Date() });

    const payload: PayloadJwt = { sub: usuario.id, email: usuario.email, rol: 'ADMIN' };
    const accessToken = await this.jwt.signAsync(payload);
    const { exp } = this.jwt.decode<{ exp: number }>(accessToken);
    return { accessToken, tokenType: 'Bearer', expiraEn: new Date(exp * 1000).toISOString() };
  }

  /** Verifica el token y que el administrador siga activo. */
  async verificarToken(token: string): Promise<UsuarioAutenticado> {
    let payload: PayloadJwt;
    try {
      payload = await this.jwt.verifyAsync<PayloadJwt>(token, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }
    if (payload.rol !== 'ADMIN') {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }
    const usuario = await this.usuarios.findOneBy({ id: payload.sub, activo: true });
    if (!usuario) {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }
    return { id: usuario.id, email: usuario.email };
  }
}
