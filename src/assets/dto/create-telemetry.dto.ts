import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional } from 'class-validator';

export class CreateTelemetryDto {
  @ApiProperty({ example: 2.7, description: 'Potência gerada em MW' })
  @IsNumber()
  powerMw: number;

  @ApiProperty({ example: 71, description: 'Temperatura em °C' })
  @IsNumber()
  temperatureC: number;

  @ApiPropertyOptional({ example: 11.4, description: 'Velocidade do vento em m/s' })
  @IsOptional()
  @IsNumber()
  windSpeedMs?: number;

  @ApiProperty({ example: '2026-09-13T12:00:00.000Z', description: 'Instante da leitura (ISO 8601)' })
  @IsISO8601()
  timestamp: string;
}