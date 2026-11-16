import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { duracionEnSegundos, VariablesEntorno } from '../config/variables-entorno.js';
import { AdminGuard } from './admin.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsuarioAdmin } from './entities/usuario-admin.entity.js';

/** JWT, solo rol ADMIN. */
@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioAdmin]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<VariablesEntorno, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: duracionEnSegundos(config.get('JWT_EXPIRES_IN', { infer: true })),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminGuard],
  exports: [AuthService, AdminGuard],
})
export class AuthModule {}
