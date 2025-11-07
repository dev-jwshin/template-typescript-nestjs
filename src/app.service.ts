import { Injectable } from '@nestjs/common';

/**
 * 애플리케이션 루트 서비스
 * - 비즈니스 로직 처리
 */
@Injectable()
export class AppService {
  /**
   * 환영 메시지 반환
   * @returns 환영 메시지
   */
  getHello(): string {
    return 'Welcome to NestJS TypeScript Template - Optimized for Claude Code! 🚀';
  }
}
