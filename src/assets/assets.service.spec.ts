import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AssetsService } from './assets.service.js';
import { AlertsService } from '../alerts/alerts.service.js';

describe('AssetsService', () => {
  let service: AssetsService;
  let alertsService: AlertsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AssetsService, AlertsService],
    }).compile();

    service = moduleRef.get(AssetsService);
    alertsService = moduleRef.get(AlertsService);
  });

  const telemetry = (temperatureC: number) => ({
    powerMw: 2.5,
    temperatureC,
    timestamp: '2026-09-13T12:00:00.000Z',
  });

  it('findOne retorna o asset WT-001', () => {
    expect(service.findOne('WT-001').id).toBe('WT-001');
  });

  it('findOne lança NotFoundException para asset inexistente', () => {
    expect(() => service.findOne('XYZ')).toThrow(NotFoundException);
  });

  it('telemetria com 70°C retorna NORMAL e NÃO gera alerta', () => {
    const result = service.addTelemetry('WT-001', telemetry(70));
    expect(result.severity).toBe('NORMAL');
    expect(result.alert).toBeNull();
    expect(alertsService.findAll()).toHaveLength(0);
  });

  it('telemetria com 80°C retorna WARNING e gera alerta', () => {
    const result = service.addTelemetry('WT-001', telemetry(80));
    expect(result.severity).toBe('WARNING');
    expect(result.alert).not.toBeNull();
    expect(result.alert!.severity).toBe('WARNING');
  });

  it('telemetria com 90°C retorna CRITICAL e gera alerta', () => {
    const result = service.addTelemetry('WT-001', telemetry(90));
    expect(result.severity).toBe('CRITICAL');
    expect(result.alert!.severity).toBe('CRITICAL');
  });

  it('telemetria para asset inexistente lança NotFoundException', () => {
    expect(() => service.addTelemetry('XYZ', telemetry(70))).toThrow(
      NotFoundException,
    );
  });

  it('findTelemetry retorna array vazio para asset sem leituras', () => {
    expect(service.findTelemetry('WT-002')).toEqual([]);
  });

  it('summary calcula métricas e contagem de alertas', () => {
    service.addTelemetry('WT-001', {
      powerMw: 2.0,
      temperatureC: 70,
      timestamp: '2026-09-13T12:00:00.000Z',
    });
    service.addTelemetry('WT-001', {
      powerMw: 3.0,
      temperatureC: 80,
      timestamp: '2026-09-13T12:01:00.000Z',
    });

    const summary = service.getSummary('WT-001');
    expect(summary.samples).toBe(2);
    expect(summary.averagePowerMw).toBe(2.5);
    expect(summary.maxTemperatureC).toBe(80);
    expect(summary.warningAlerts).toBe(1);
    expect(summary.criticalAlerts).toBe(0);
  });

  it('summary sem amostras retorna zero e maxTemperatureC null', () => {
    const summary = service.getSummary('WT-002');
    expect(summary.samples).toBe(0);
    expect(summary.averagePowerMw).toBe(0);
    expect(summary.maxTemperatureC).toBeNull();
    expect(summary.warningAlerts).toBe(0);
  });
});