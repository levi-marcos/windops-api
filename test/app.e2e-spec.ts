import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('WindOps API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health → 200 { status: ok }', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /assets → 200 com os assets de seed', async () => {
    const res = await request(app.getHttpServer()).get('/assets').expect(200);
    expect(res.body).toHaveLength(3);
  });

  it('GET /assets/WT-001 → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/assets/WT-001')
      .expect(200);
    expect(res.body.id).toBe('WT-001');
  });

  it('GET /assets/XYZ → 404', () => {
    return request(app.getHttpServer()).get('/assets/XYZ').expect(404);
  });

  it('POST /assets/WT-001/telemetry com body inválido → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/assets/WT-001/telemetry')
      .send({ powerMw: 'muito', temperatureC: 'quente' })
      .expect(400);
    expect(res.body.message.join(', ')).toContain('powerMw');
  });

  it('POST /assets/XYZ/telemetry válido → 404', () => {
    return request(app.getHttpServer())
      .post('/assets/XYZ/telemetry')
      .send({
        powerMw: 2.5,
        temperatureC: 70,
        timestamp: '2026-09-13T12:00:00.000Z',
      })
      .expect(404);
  });

  it('fluxo completo: 90°C → CRITICAL, alerta criado, summary consistente', async () => {
    const post = await request(app.getHttpServer())
      .post('/assets/WT-001/telemetry')
      .send({
        powerMw: 2.7,
        temperatureC: 90,
        windSpeedMs: 11.4,
        timestamp: '2026-09-13T12:00:00.000Z',
      })
      .expect(201);

    expect(post.body.severity).toBe('CRITICAL');
    expect(post.body.alert).not.toBeNull();
    expect(post.body.alert.severity).toBe('CRITICAL');

    const alerts = await request(app.getHttpServer()).get('/alerts').expect(200);
    expect(alerts.body).toHaveLength(1);
    expect(alerts.body[0].severity).toBe('CRITICAL');

    const summary = await request(app.getHttpServer())
      .get('/assets/WT-001/summary')
      .expect(200);
    expect(summary.body.samples).toBe(1);
    expect(summary.body.maxTemperatureC).toBe(90);
    expect(summary.body.criticalAlerts).toBe(1);
  });
});