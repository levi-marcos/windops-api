import { Controller, Get, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import type { Alert, AlertFilters } from './alerts.service.js';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(
    @Query('severity') severity?: AlertFilters['severity'],
    @Query('assetId') assetId?: string,
  ): Alert[] {
    return this.alertsService.findAll({ severity, assetId });
  }
}