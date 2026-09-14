import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service.js';
import type { Alert, AlertFilters } from './alerts.service.js';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista alertas', description: 'Filtros opcionais por severidade e assetId.' })
  @ApiQuery({ name: 'severity', required: false, enum: ['WARNING', 'CRITICAL'], description: 'Filtra por severidade' })
  @ApiQuery({ name: 'assetId', required: false, description: 'Filtra pelo ativo (ex.: WT-001)' })
  async findAll(
    @Query('severity') severity?: AlertFilters['severity'],
    @Query('assetId') assetId?: string,
  ): Promise<Alert[]> {
    return this.alertsService.findAll({ severity, assetId });
  }
}