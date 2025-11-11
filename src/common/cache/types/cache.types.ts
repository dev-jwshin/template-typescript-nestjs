/**
 * 캐시 옵션
 */
export interface CacheOptions {
  /**
   * TTL (Time To Live) in seconds
   */
  ttl?: number;

  /**
   * 캐시 태그 (그룹 무효화용)
   */
  tags?: string[];

  /**
   * 네임스페이스 (키 접두사)
   */
  namespace?: string;
}

/**
 * 캐시 엔트리
 */
export interface CacheEntry<T = any> {
  /**
   * 캐시된 데이터
   */
  data: T;

  /**
   * 만료 시간 (Unix timestamp)
   */
  expiresAt: number;

  /**
   * 생성 시간 (Unix timestamp)
   */
  createdAt: number;

  /**
   * 캐시 태그
   */
  tags?: string[];
}

/**
 * 캐시 메트릭
 */
export interface CacheMetrics {
  /**
   * 캐시 히트 수
   */
  hits: number;

  /**
   * 캐시 미스 수
   */
  misses: number;

  /**
   * 캐시 저장 횟수
   */
  sets: number;

  /**
   * 캐시 삭제 횟수
   */
  deletes: number;

  /**
   * 캐시 히트율 (0.0 ~ 1.0)
   */
  hitRate: number;

  /**
   * 평균 조회 시간 (ms)
   */
  avgGetTime?: number;

  /**
   * 평균 저장 시간 (ms)
   */
  avgSetTime?: number;
}

/**
 * 캐시 설정
 */
export interface CacheConfig {
  /**
   * 캐시 드라이버 (memory | redis)
   */
  driver: 'memory' | 'redis';

  /**
   * 기본 TTL (초 단위)
   */
  ttl: number;

  /**
   * Redis 설정
   */
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };

  /**
   * Memory 설정
   */
  memory?: {
    /**
     * 최대 항목 수
     */
    max?: number;

    /**
     * 최대 메모리 크기 (bytes)
     */
    maxSize?: number;

    /**
     * 자동 정리 간격 (ms)
     */
    cleanupInterval?: number;
  };
}

/**
 * 캐시 저장 항목
 */
export interface CacheSetItem<T = any> {
  /**
   * 캐시 키
   */
  key: string;

  /**
   * 저장할 값
   */
  value: T;

  /**
   * TTL (초 단위)
   */
  ttl?: number;
}

/**
 * 캐시 통계
 */
export interface CacheStats {
  /**
   * 총 항목 수
   */
  size: number;

  /**
   * 메모리 사용량 (bytes)
   */
  memoryUsage?: number;

  /**
   * 메트릭
   */
  metrics: CacheMetrics;

  /**
   * 연결 상태
   */
  connected: boolean;

  /**
   * 캐시 드라이버
   */
  driver: 'memory' | 'redis';
}
