import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'API root' })
  @ApiResponse({ status: 200, description: 'API information' })
  getApiInfo() {
    return {
      name: 'Property Marketplace API',
      version: '1.0.0',
      description: 'A production-ready backend for property marketplace platform',
      documentation: '/api/docs',
    };
  }
}
