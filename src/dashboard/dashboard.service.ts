import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface DashboardOverview {
  totalAssets: number;
  onlineAssets: number;
  attentionAssets: number;
  maintenanceAssets: number;
  criticalAlerts: number;
  totalAlerts: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<DashboardOverview> {
    const [
      totalAssets,
      onlineAssets,
      attentionAssets,
      maintenanceAssets,
      criticalAlerts,
      totalAlerts,
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'ONLINE' } }),
      this.prisma.asset.count({ where: { status: 'ATTENTION' } }),
      this.prisma.asset.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.alert.count({ where: { severity: 'CRITICAL' } }),
      this.prisma.alert.count(),
    ]);

    return {
      totalAssets,
      onlineAssets,
      attentionAssets,
      maintenanceAssets,
      criticalAlerts,
      totalAlerts,
    };
  }
}