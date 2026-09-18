import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { AssetsModule } from './assets/assets.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [PrismaModule, AlertsModule, AssetsModule, DashboardModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}