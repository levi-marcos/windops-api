import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService, DashboardOverview } from './dashboard.service.js';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'KPIs agregados para o dashboard',
    description: 'Contagens consolidadas de ativos e alertas em uma única resposta.',
  })
  getOverview(): Promise<DashboardOverview> {
    return this.dashboardService.getOverview();
  }
}