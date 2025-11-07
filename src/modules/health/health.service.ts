import { Injectable } from '@nestjs/common';

/**
 * 헬스체크 서비스
 * - 애플리케이션 상태 모니터링
 * - 준비 상태 검증
 */
@Injectable()
export class HealthService {
  private readonly startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * 기본 헬스체크
   * @returns 서비스 상태, 타임스탬프, 업타임
   */
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * 서비스 준비 상태 확인
   * @returns 준비 상태 정보
   */
  ready() {
    // 필요한 경우 데이터베이스, 외부 서비스 연결 확인 로직 추가
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
