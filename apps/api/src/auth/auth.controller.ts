import { Body, Controller, Header, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CACHE_CONTROL } from '../common/cache-control.js';
import { LoginCuerpo, SesionRespuesta } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Frena ataques de fuerza bruta: 5 intentos por minuto por IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Header('Cache-Control', CACHE_CONTROL.sinCache)
  @ApiOperation({ summary: 'Inicio de sesión del administrador' })
  @ApiOkResponse({ type: SesionRespuesta })
  @ApiUnauthorizedResponse({ description: 'Correo o contraseña incorrectos' })
  iniciarSesion(@Body() cuerpo: LoginCuerpo): Promise<SesionRespuesta> {
    return this.auth.iniciarSesion(cuerpo.email, cuerpo.password);
  }
}
