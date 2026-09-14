export type TemperatureSeverity = 'NORMAL' | 'WARNING' | 'CRITICAL';

export function classifyTemperature(temperatureC: number): TemperatureSeverity {
  if (temperatureC < 75) return 'NORMAL';
  if (temperatureC < 85) return 'WARNING';
  return 'CRITICAL';
}