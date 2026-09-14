import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service.js';
import type { AssetSummary, TelemetryResult } from './assets.service.js';
import { CreateAssetDto } from './dto/create-asset.dto.js';
import { CreateTelemetryDto } from './dto/create-telemetry.dto.js';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto.js';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista ativos', description: 'Filtros opcionais por status e tipo.' })
  @ApiQuery({ name: 'status', required: false, enum: ['ONLINE', 'ATTENTION', 'MAINTENANCE', 'OFFLINE'], description: 'Filtra por status' })
  @ApiQuery({ name: 'type', required: false, enum: ['WIND_TURBINE', 'SOLAR_ARRAY'], description: 'Filtra por tipo' })
  findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.assetsService.findAll(status, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca ativo por ID', description: 'Retorna o ativo ou 404.' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um ativo', description: 'Retorna 409 se o ID já existir.' })
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualiza o status de um ativo' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAssetStatusDto) {
    return this.assetsService.updateStatus(id, dto);
  }

  @Post(':id/telemetry')
  @ApiOperation({
    summary: 'Registra telemetria',
    description: 'Classifica a temperatura e gera alerta em WARNING/CRITICAL.',
  })
  addTelemetry(
    @Param('id') id: string,
    @Body() dto: CreateTelemetryDto,
  ): Promise<TelemetryResult> {
    return this.assetsService.addTelemetry(id, dto);
  }

  @Get(':id/telemetry')
  @ApiOperation({ summary: 'Lista leituras de telemetria de um ativo' })
  getTelemetry(@Param('id') id: string) {
    return this.assetsService.findTelemetry(id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Resumo operacional de um ativo', description: 'Média de potência, temperatura máxima e contagem de alertas.' })
  getSummary(@Param('id') id: string): Promise<AssetSummary> {
    return this.assetsService.getSummary(id);
  }
}