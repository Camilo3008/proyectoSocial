import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Request } from 'express';
import { AuthService, type UsuarioAutenticado } from './auth.service.js';

type PeticionConUsuario = Request & { usuario?: UsuarioAutenticado };

/** Protege las rutas de administración: exige un JWT válido de un ADMIN activo. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<PeticionConUsuario>();
    const [tipo, token] = peticion.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Falta el token de acceso');
    }
    peticion.usuario = await this.auth.verificarToken(token);
    return true;
  }
}

/** Inyecta el administrador autenticado (requiere AdminGuard). */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const usuario = contexto.switchToHttp().getRequest<PeticionConUsuario>().usuario;
    if (!usuario) {
      throw new UnauthorizedException();
    }
    return usuario;
  },
);
