import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { type VariablesEntorno } from './config/variables-entorno.js';
import { configurarAplicacion, PREFIJO_API } from './configurar-aplicacion.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configurarAplicacion(app);

  const puerto = app.get<ConfigService<VariablesEntorno, true>>(ConfigService).get('PORT', {
    infer: true,
  });
  await app.listen(puerto);
  Logger.log(`API escuchando en http://localhost:${puerto}/${PREFIJO_API}`, 'Bootstrap');
  Logger.log(`Documentación en http://localhost:${puerto}/${PREFIJO_API}/docs`, 'Bootstrap');
}

await bootstrap();
