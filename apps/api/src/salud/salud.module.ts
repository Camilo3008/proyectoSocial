import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module.js';
import { SaludController } from './salud.controller.js';
import { SaludService } from './salud.service.js';

@Module({
  imports: [CatalogoModule],
  controllers: [SaludController],
  providers: [SaludService],
})
export class SaludModule {}
