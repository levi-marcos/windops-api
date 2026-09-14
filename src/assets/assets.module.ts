import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module.js';
import { AssetsController } from './assets.controller.js';
import { AssetsService } from './assets.service.js';

@Module({
  imports: [AlertsModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}