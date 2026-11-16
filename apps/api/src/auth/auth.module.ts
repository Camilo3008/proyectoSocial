import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service.js';
import { UsuarioAdmin } from './entities/usuario-admin.entity.js';

/** JWT, solo rol ADMIN. */
@Module({
  imports: [TypeOrmModule.forFeature([UsuarioAdmin])],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
