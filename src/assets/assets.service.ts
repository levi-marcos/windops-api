import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AlertsService, Alert } from '../alerts/alerts.service.js';
import { classifyTemperature, TemperatureSeverity } from '../domain/temperature.js';
import {
  AssetStatus,
  AssetType,
  CreateAssetDto,
} from './dto/create-asset.dto.js';
import { CreateTelemetryDto } from './dto/create-telemetry.dto.js';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto.js';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  ratedPowerMw: number;
  location: string;
}

export interface Telemetry {
  assetId: string;
  powerMw: number;
  windSpeedMs: number | null;
  temperatureC: number;
  timestamp: string;
}

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
  private readonly telemetryByAsset = new Map<string, Telemetry[]>();

  private readonly assets: Asset[] = [
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
  ];

  constructor(private readonly alertsService: AlertsService) {}

  findAll(status?: string, type?: string): Asset[] {
    return this.assets.filter((asset) => {
      if (status && asset.status !== status) return false;
      if (type && asset.type !== type) return false;
      return true;
    });
  }

  findOne(id: string): Asset {
    const asset = this.assets.find((item) => item.id === id);
    if (!asset) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
    return asset;
  }

  create(dto: CreateAssetDto): Asset {
    if (this.assets.some((asset) => asset.id === dto.id)) {
      throw new ConflictException(`Asset ${dto.id} already exists`);
    }

    const asset: Asset = {
      id: dto.id,
      name: dto.name,
      type: dto.type,
      status: dto.status ?? AssetStatus.ONLINE,
      ratedPowerMw: dto.ratedPowerMw,
      location: dto.location,
    };
    this.assets.push(asset);
    return asset;
  }

  updateStatus(id: string, dto: UpdateAssetStatusDto): Asset {
    const asset = this.findOne(id);
    asset.status = dto.status;
    return asset;
  }

  addTelemetry(assetId: string, dto: CreateTelemetryDto): TelemetryResult {
    this.findOne(assetId);

    const severity = classifyTemperature(dto.temperatureC);
    const alert =
      severity === 'NORMAL'
        ? null
        : this.alertsService.create({
            assetId,
            severity,
            type: 'HIGH_TEMPERATURE',
            message:
              severity === 'WARNING'
                ? 'Temperatura acima do limite de atenção.'
                : 'Temperatura em nível crítico.',
            timestamp: dto.timestamp,
          });

    const telemetry: Telemetry = {
      assetId,
      powerMw: dto.powerMw,
      windSpeedMs: dto.windSpeedMs ?? null,
      temperatureC: dto.temperatureC,
      timestamp: dto.timestamp,
    };

    const readings = this.telemetryByAsset.get(assetId) ?? [];
    readings.push(telemetry);
    this.telemetryByAsset.set(assetId, readings);

    return { ...telemetry, severity, alert };
  }

  findTelemetry(assetId: string): Telemetry[] {
    this.findOne(assetId);
    return this.telemetryByAsset.get(assetId) ?? [];
  }

  getSummary(assetId: string): AssetSummary {
    const readings = this.findTelemetry(assetId);
    const alerts = this.alertsService.findAll({ assetId });

    const samples = readings.length;
    const averagePowerMw =
      samples === 0
        ? 0
        : readings.reduce((sum, item) => sum + item.powerMw, 0) / samples;
    const maxTemperatureC =
      samples === 0
        ? null
        : Math.max(...readings.map((item) => item.temperatureC));

    return {
      assetId,
      samples,
      averagePowerMw: Number(averagePowerMw.toFixed(2)),
      maxTemperatureC,
      warningAlerts: alerts.filter((item) => item.severity === 'WARNING').length,
      criticalAlerts: alerts.filter((item) => item.severity === 'CRITICAL').length,
    };
  }
}