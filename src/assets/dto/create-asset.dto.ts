import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum AssetType {
  WIND_TURBINE = 'WIND_TURBINE',
  SOLAR_ARRAY = 'SOLAR_ARRAY',
}

export enum AssetStatus {
  ONLINE = 'ONLINE',
  ATTENTION = 'ATTENTION',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
}

export class CreateAssetDto {
  @ApiProperty({ example: 'WT-003', description: 'Identificador único do ativo' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Aerogerador 03', description: 'Nome de exibição' })
  @IsString()
  name: string;

  @ApiProperty({ enum: AssetType, example: AssetType.WIND_TURBINE })
  @IsEnum(AssetType)
  type: AssetType;

  @ApiPropertyOptional({
    enum: AssetStatus,
    default: AssetStatus.ONLINE,
    description: 'Se omitido, assume ONLINE',
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiProperty({ example: 3.2, description: 'Potência nominal em MW' })
  @IsNumber()
  ratedPowerMw: number;

  @ApiProperty({ example: 'Parque Demo A' })
  @IsString()
  location: string;
}