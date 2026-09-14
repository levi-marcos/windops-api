import { Injectable } from '@nestjs/common';
import { TemperatureSeverity } from '../domain/temperature.js';

export interface Alert {
  id: string;
  assetId: string;
  severity: 'WARNING' | 'CRITICAL';
  type: 'HIGH_TEMPERATURE';
  message: string;
  timestamp: string;
}

export interface AlertFilters {
  severity?: TemperatureSeverity;
  assetId?: string;
}

@Injectable()
export class AlertsService {
  private readonly alerts: Alert[] = [];
  private nextId = 1;

  create(alert: Omit<Alert, 'id'>): Alert {
    const record: Alert = {
      id: `AL-${String(this.nextId++).padStart(3, '0')}`,
      ...alert,
    };
    this.alerts.push(record);
    return record;
  }

  findAll(filters: AlertFilters = {}): Alert[] {
    return this.alerts.filter((alert) => {
      if (filters.severity && alert.severity !== filters.severity) {
        return false;
      }
      if (filters.assetId && alert.assetId !== filters.assetId) {
        return false;
      }
      return true;
    });
  }
}