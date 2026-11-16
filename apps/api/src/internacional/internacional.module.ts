import { Module } from '@nestjs/common';
import { InternacionalService } from './internacional.service.js';

/** Series de commodities y datos por país. */
@Module({
  providers: [InternacionalService],
  exports: [InternacionalService],
})
export class InternacionalModule {}
