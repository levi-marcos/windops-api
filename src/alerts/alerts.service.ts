import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TemperatureSeverity } from '../domain/temperature.js';
import type { Alert as PrismaAlert } from '@prisma/client';

export type Alert = PrismaAlert;

export interface AlertFilters {
  severity?: TemperatureSeverity;
  assetId?: string;
}

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    alert: Omit<Alert, 'id' | 'createdAt'>,
  ): Promise<Alert> {
    const existing = await this.prisma.alert.findMany({
      select: { id: true },
    });
    const maxNumber = existing.reduce((max, item) => {
      const match = item.id.match(/^AL-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const id = `AL-${String(maxNumber + 1).padStart(3, '0')}`;

    return this.prisma.alert.create({
      data: { ...alert, id },
    });
  }

  async findAll(filters: AlertFilters = {}): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: {
        ...(filters.severity ? { severity: filters.severity } : {}),
        ...(filters.assetId ? { assetId: filters.assetId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}