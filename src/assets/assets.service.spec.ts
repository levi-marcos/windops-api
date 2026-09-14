import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AssetsService } from './assets.service.js';
import { AlertsService } from '../alerts/alerts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockAsset = {
  id: 'WT-001',
  name: 'Aerogerador 01',
  type: 'WIND_TURBINE',
  status: 'ONLINE',
  ratedPowerMw: 3.2,
  location: 'Parque Demo A',
  createdAt: new Date(),
};

const mockTelemetry = (temperatureC: number) => ({
  id: 1,
  assetId: 'WT-001',
  powerMw: 2.5,
  windSpeedMs: null,
  temperatureC,
  timestamp: '2026-09-13T12:00:00.000Z',
  createdAt: new Date(),
});

const mockAlert = (severity: string) => ({
  id: 'AL-001',
  assetId: 'WT-001',
  severity,
  type: 'HIGH_TEMPERATURE',
  message: severity === 'WARNING' ? 'Temperatura acima do limite de atenção.' : 'Temperatura em nível crítico.',
  timestamp: '2026-09-13T12:00:00.000Z',
  createdAt: new Date(),
});

const prismaMock = {
  asset: {
    findUnique: async ({ where }: any) => where.id === 'WT-001' ? mockAsset : null,
    findMany: async () => [mockAsset],
    count: async () => 3,
    create: async ({ data }: any) => ({ ...data, createdAt: new Date() }),
    update: async ({ data }: any) => ({ ...mockAsset, ...data }),
    createMany: async () => ({ count: 0 }),
  },
  telemetry: {
    findMany: async () => [],
    create: async ({ data }: any) => mockTelemetry(data.temperatureC),
    groupBy: async () => [],
  },
  alert: {
    findMany: async () => [],
    count: async () => 0,
    create: async ({ data }: any) => mockAlert(data.severity),
    groupBy: async () => [],
  },
};

describe('AssetsService (unit — Prisma mocked)', () => {
  let service: AssetsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AssetsService,
        AlertsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = moduleRef.get(AssetsService);
  });

  it('findOne retorna o asset WT-001', async () => {
    const asset = await service.findOne('WT-001');
    expect(asset.id).toBe('WT-001');
  });

  it('findOne lança NotFoundException para asset inexistente', async () => {
    await expect(() => service.findOne('XYZ')).rejects.toThrow(NotFoundException);
  });

  it('telemetria com 70°C retorna NORMAL e NÃO gera alerta', async () => {
    prismaMock.alert.count = async () => 0;
    prismaMock.telemetry.create = async ({ data }: any) => mockTelemetry(data.temperatureC);

    const result = await service.addTelemetry('WT-001', {
      powerMw: 2.5,
      temperatureC: 70,
      timestamp: '2026-09-13T12:00:00.000Z',
    });
    expect(result.severity).toBe('NORMAL');
    expect(result.alert).toBeNull();
  });

  it('telemetria com 80°C retorna WARNING e gera alerta', async () => {
    prismaMock.alert.count = async () => 0;
    prismaMock.alert.create = async ({ data }: any) => mockAlert(data.severity);
    prismaMock.telemetry.create = async ({ data }: any) => mockTelemetry(data.temperatureC);

    const result = await service.addTelemetry('WT-001', {
      powerMw: 2.5,
      temperatureC: 80,
      timestamp: '2026-09-13T12:00:00.000Z',
    });
    expect(result.severity).toBe('WARNING');
    expect(result.alert).not.toBeNull();
    expect(result.alert!.severity).toBe('WARNING');
  });

  it('telemetria com 90°C retorna CRITICAL e gera alerta', async () => {
    prismaMock.alert.count = async () => 0;
    prismaMock.alert.create = async ({ data }: any) => mockAlert(data.severity);
    prismaMock.telemetry.create = async ({ data }: any) => mockTelemetry(data.temperatureC);

    const result = await service.addTelemetry('WT-001', {
      powerMw: 2.5,
      temperatureC: 90,
      timestamp: '2026-09-13T12:00:00.000Z',
    });
    expect(result.severity).toBe('CRITICAL');
    expect(result.alert!.severity).toBe('CRITICAL');
  });

  it('telemetria para asset inexistente lança NotFoundException', async () => {
    await expect(
      service.addTelemetry('XYZ', {
        powerMw: 2.5,
        temperatureC: 70,
        timestamp: '2026-09-13T12:00:00.000Z',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('summary sem amostras retorna zero e maxTemperatureC null', async () => {
    prismaMock.telemetry.findMany = async () => [];
    prismaMock.alert.groupBy = async () => [];

    const summary = await service.getSummary('WT-001');
    expect(summary.samples).toBe(0);
    expect(summary.averagePowerMw).toBe(0);
    expect(summary.maxTemperatureC).toBeNull();
    expect(summary.warningAlerts).toBe(0);
  });

  it('summary com dados calcula métricas e contagem de alertas', async () => {
    prismaMock.telemetry.findMany = async () => [
      mockTelemetry(70),
      { ...mockTelemetry(80), powerMw: 3.0, temperatureC: 80 },
    ];
    prismaMock.alert.groupBy = async () => [
      { severity: 'WARNING', _count: 1 },
    ];

    const summary = await service.getSummary('WT-001');
    expect(summary.samples).toBe(2);
    expect(summary.averagePowerMw).toBe(2.75);
    expect(summary.maxTemperatureC).toBe(80);
    expect(summary.warningAlerts).toBe(1);
    expect(summary.criticalAlerts).toBe(0);
  });
});