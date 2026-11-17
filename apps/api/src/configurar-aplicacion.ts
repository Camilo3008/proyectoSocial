import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { type VariablesEntorno } from './config/variables-entorno.js';

export const PREFIJO_API = 'api';

/**
 * Configuración transversal de la aplicación HTTP. La comparten main.ts y las
 * pruebas e2e para que ambas se comporten igual.
 */
export function configurarAplicacion(app: INestApplication): void {
  const config = app.get<ConfigService<VariablesEntorno, true>>(ConfigService);
  const express = app as NestExpressApplication;

  app.setGlobalPrefix(PREFIJO_API);
  express.set('etag', 'strong');
  express.disable('x-powered-by');
  const proxies = config.get('TRUST_PROXY', { infer: true });
  if (proxies > 0) express.set('trust proxy', proxies);

  app.use(helmet());
  app.enableCors({
    origin: config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origen) => origen.trim())
      .filter(Boolean),
    methods: ['GET', 'HEAD', 'POST', 'PATCH'],
    maxAge: 86_400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const documento = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('AgroPrecios API')
      .setDescription(
        'API pública de solo lectura con precios de referencia de productos agrícolas. ' +
          'Los precios provienen de fuentes públicas y no constituyen una oferta de compra.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup(`${PREFIJO_API}/docs`, app, documento);
}
