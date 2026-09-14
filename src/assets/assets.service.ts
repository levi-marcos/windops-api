import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AlertsService, Alert } from '../alerts/alerts.service.js';
import { classifyTemperature, TemperatureSeverity } from '../domain/temperature.js';
import {
  AssetStatus,
  AssetType,
  CreateAssetDto,
} from './dto/create-asset.dto.js';
import { CreateTelemetryDto } from './dto/create-telemetry.dto.js';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto.js';
import type { Asset as PrismaAsset, Telemetry as PrismaTelemetry } from '@prisma/client';

export type Asset = PrismaAsset;
export type Telemetry = PrismaTelemetry;

export interface TelemetryResult extends Telemetry {
  severity: TemperatureSeverity;
  alert: Alert | null;
}

export interface AssetSummary {
  assetId: string;
  samples: number;
  averagePowerMw: number;
  maxTemperatureC: number | null;
  warningAlerts: number;
  criticalAlerts: number;
}

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureSeedData();
  }

  private async ensureSeedData() {
    const count = await this.prisma.asset.count();
    if (count > 0) return;

    await this.prisma.asset.createMany({
      data: [
        {
          id: 'WT-001',
          name: 'Aerogerador 01',
          type: AssetType.WIND_TURBINE,
          status: AssetStatus.ONLINE,
          ratedPowerMw: 3.2,
          location: 'Parque Demo A',
        },
        {
          id: 'WT-002',
          name: 'Aerogerador 02',
          type: AssetType.WIND_TURBINE,
          status: AssetStatus.ONLINE,
          ratedPowerMw: 2.8,
          location: 'Parque Demo A',
        },
        {
          id: 'PV-001',
          name: 'Painel Solar 01',
          type: AssetType.SOLAR_ARRAY,
          status: AssetStatus.MAINTENANCE,
          ratedPowerMw: 1.5,
          location: 'Parque Demo B',
        },
      ],
    });
  }

  async findAll(status?: string, type?: string): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
    return asset;
  }

  async create(dto: CreateAssetDto): Promise<Asset> {
    const existing = await this.prisma.asset.findUnique({
      where: { id: dto.id },
    });
    if (existing) {
      throw new ConflictException(`Asset ${dto.id} already exists`);
    }

    return this.prisma.asset.create({
      data: {
        id: dto.id,
        name: dto.name,
        type: dto.type,
        status: dto.status ?? AssetStatus.ONLINE,
        ratedPowerMw: dto.ratedPowerMw,
        location: dto.location,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateAssetStatusDto): Promise<Asset> {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async addTelemetry(
    assetId: string,
    dto: CreateTelemetryDto,
  ): Promise<TelemetryResult> {
    await this.findOne(assetId);

    const severity = classifyTemperature(dto.temperatureC);

    const alert =
      severity === 'NORMAL'
        ? null
        : await this.alertsService.create({
            assetId,
            severity,
            type: 'HIGH_TEMPERATURE',
            message:
              severity === 'WARNING'
                ? 'Temperatura acima do limite de atenção.'
                : 'Temperatura em nível crítico.',
            timestamp: dto.timestamp,
          });

    const telemetry = await this.prisma.telemetry.create({
      data: {
        assetId,
        powerMw: dto.powerMw,
        windSpeedMs: dto.windSpeedMs ?? null,
        temperatureC: dto.temperatureC,
        timestamp: dto.timestamp,
      },
    });

    return { ...telemetry, severity, alert };
  }

  async findTelemetry(assetId: string): Promise<Telemetry[]> {
    await this.findOne(assetId);
    return this.prisma.telemetry.findMany({
      where: { assetId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSummary(assetId: string): Promise<AssetSummary> {
    await this.findOne(assetId);

    const [readings, alertCounts] = await Promise.all([
      this.prisma.telemetry.findMany({ where: { assetId } }),
      this.prisma.alert.groupBy({
        by: ['severity'],
        where: { assetId },
        _count: true,
      }),
    ]);

    const samples = readings.length;
    const averagePowerMw =
      samples === 0
        ? 0
        : readings.reduce((sum, r) => sum + r.powerMw, 0) / samples;
    const maxTemperatureC =
      samples === 0
        ? null
        : Math.max(...readings.map((r) => r.temperatureC));

    const countBySeverity = (severity: string) =>
      alertCounts.find((g) => g.severity === severity)?._count ?? 0;

    return {
      assetId,
      samples,
      averagePowerMw: Number(averagePowerMw.toFixed(2)),
      maxTemperatureC,
      warningAlerts: countBySeverity('WARNING'),
      criticalAlerts: countBySeverity('CRITICAL'),
    };
  }
}