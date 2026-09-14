import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AssetsService } from './assets.service.js';
import type { AssetSummary, TelemetryResult } from './assets.service.js';
import { CreateAssetDto } from './dto/create-asset.dto.js';
import { CreateTelemetryDto } from './dto/create-telemetry.dto.js';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto.js';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.assetsService.findAll(status, type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAssetStatusDto) {
    return this.assetsService.updateStatus(id, dto);
  }

  @Post(':id/telemetry')
  addTelemetry(
    @Param('id') id: string,
    @Body() dto: CreateTelemetryDto,
  ): TelemetryResult {
    return this.assetsService.addTelemetry(id, dto);
  }

  @Get(':id/telemetry')
  getTelemetry(@Param('id') id: string) {
    return this.assetsService.findTelemetry(id);
  }

  @Get(':id/summary')
  getSummary(@Param('id') id: string): AssetSummary {
    return this.assetsService.getSummary(id);
  }
}