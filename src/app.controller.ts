import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * 애플리케이션 루트 컨트롤러
 * - 기본 엔드포인트 제공
 */
@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * 애플리케이션 루트 엔드포인트
   * @returns 환영 메시지
   */
  @Get()
  @ApiOperation({ summary: '애플리케이션 루트' })
  @ApiResponse({ status: 200, description: '환영 메시지 반환' })
  getHello(): string {
    return this.appService.getHello();
  }
}
