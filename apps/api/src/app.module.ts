import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { CatalogoModule } from './catalogo/catalogo.module.js';
import { ConfigModule } from './config/config.module.js';
import { VariablesEntorno } from './config/variables-entorno.js';
import { DatabaseModule } from './database/database.module.js';
import { IngestaModule } from './ingesta/ingesta.module.js';
import { InternacionalModule } from './internacional/internacional.module.js';
import { PreciosModule } from './precios/precios.module.js';
import { SaludModule } from './salud/salud.module.js';
import { TasasModule } from './tasas/tasas.module.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<VariablesEntorno, true>) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
      }),
    }),
    SaludModule,
    CatalogoModule,
    PreciosModule,
    InternacionalModule,
    TasasModule,
    IngestaModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
