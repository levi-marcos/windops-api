import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AssetStatus } from './create-asset.dto.js';

export class UpdateAssetStatusDto {
  @ApiProperty({ enum: AssetStatus, example: AssetStatus.ATTENTION })
  @IsEnum(AssetStatus)
  status: AssetStatus;
}