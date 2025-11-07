import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

/**
 * 헬스체크 컨트롤러
 * - 애플리케이션 상태 확인
 * - 서비스 준비 상태 확인
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * 기본 헬스체크 엔드포인트
   * @returns 서비스 상태 정보
   */
  @Get()
  @ApiOperation({ summary: '서비스 헬스체크' })
  @ApiResponse({
    status: 200,
    description: '서비스 정상 동작 중',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 12345 },
      },
    },
  })
  check() {
    return this.healthService.check();
  }

  /**
   * 서비스 준비 상태 확인
   * @returns 서비스 준비 상태
   */
  @Get('ready')
  @ApiOperation({ summary: '서비스 준비 상태 확인' })
  @ApiResponse({ status: 200, description: '서비스 준비 완료' })
  ready() {
    return this.healthService.ready();
  }
}
