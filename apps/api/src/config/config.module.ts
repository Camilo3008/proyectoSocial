import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { rutasArchivoEnv } from './archivo-env.js';
import { validarEntorno } from './variables-entorno.js';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: rutasArchivoEnv(),
      validate: validarEntorno,
    }),
  ],
})
export class ConfigModule {}
