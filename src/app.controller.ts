import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class AppController {

  @Get()
  @ApiOperation({ summary: 'Verifica se a API está no ar' })
  getHealth(): object {
    return { status: 'ok' };
  }

}