import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { AssetsModule } from './assets/assets.module.js';

@Module({
  imports: [AlertsModule, AssetsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}