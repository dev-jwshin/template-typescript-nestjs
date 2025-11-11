import { Injectable } from '@nestjs/common';
import { CacheMetrics } from '../types/cache.types';

/**
 * 캐시 메트릭 서비스
 *
 * 캐시 성능 모니터링을 위한 메트릭을 수집하고 분석합니다.
 *
 * 주요 메트릭:
 * - 캐시 히트/미스 횟수
 * - 캐시 히트율
 * - 평균 조회/저장 시간
 * - 총 작업 횟수
 *
 * 사용 예시:
 * ```typescript
 * const metrics = this.metricsService.getMetrics();
 * console.log(`캐시 히트율: ${(metrics.hitRate * 100).toFixed(2)}%`);
 * ```
 */
@Injectable()
export class CacheMetricsService {
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    getTimes: [] as number[],
    setTimes: [] as number[],
  };

  /**
   * 캐시 히트 기록
   */
  recordHit(): void {
    this.metrics.hits++;
  }

  /**
   * 캐시 미스 기록
   */
  recordMiss(): void {
    this.metrics.misses++;
  }

  /**
   * 캐시 저장 기록
   */
  recordSet(): void {
    this.metrics.sets++;
  }

  /**
   * 캐시 삭제 기록
   */
  recordDelete(): void {
    this.metrics.deletes++;
  }

  /**
   * 조회 시간 기록
   *
   * @param timeMs 조회 시간 (밀리초)
   */
  recordGetTime(timeMs: number): void {
    this.metrics.getTimes.push(timeMs);

    // 최근 1000개 기록만 유지
    if (this.metrics.getTimes.length > 1000) {
      this.metrics.getTimes.shift();
    }
  }

  /**
   * 저장 시간 기록
   *
   * @param timeMs 저장 시간 (밀리초)
   */
  recordSetTime(timeMs: number): void {
    this.metrics.setTimes.push(timeMs);

    // 최근 1000개 기록만 유지
    if (this.metrics.setTimes.length > 1000) {
      this.metrics.setTimes.shift();
    }
  }

  /**
   * 캐시 메트릭 조회
   *
   * @returns 캐시 성능 메트릭
   */
  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      sets: this.metrics.sets,
      deletes: this.metrics.deletes,
      hitRate,
      avgGetTime: this.calculateAverage(this.metrics.getTimes),
      avgSetTime: this.calculateAverage(this.metrics.setTimes),
    };
  }

  /**
   * 메트릭 초기화
   */
  reset(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      getTimes: [],
      setTimes: [],
    };
  }

  /**
   * 백분위수 조회
   *
   * @param type 작업 타입 ('get' 또는 'set')
   * @returns 백분위수 통계
   */
  getPercentiles(type: 'get' | 'set'): {
    p50: number;
    p95: number;
    p99: number;
  } {
    const values = type === 'get' ? this.metrics.getTimes : this.metrics.setTimes;

    return {
      p50: this.calculatePercentile(values, 50) || 0,
      p95: this.calculatePercentile(values, 95) || 0,
      p99: this.calculatePercentile(values, 99) || 0,
    };
  }

  /**
   * 상세 통계 조회
   */
  getDetailedStats(): {
    metrics: CacheMetrics;
    percentiles: {
      p50GetTime?: number;
      p95GetTime?: number;
      p99GetTime?: number;
      p50SetTime?: number;
      p95SetTime?: number;
      p99SetTime?: number;
    };
  } {
    const metrics = this.getMetrics();

    return {
      metrics,
      percentiles: {
        p50GetTime: this.calculatePercentile(this.metrics.getTimes, 50),
        p95GetTime: this.calculatePercentile(this.metrics.getTimes, 95),
        p99GetTime: this.calculatePercentile(this.metrics.getTimes, 99),
        p50SetTime: this.calculatePercentile(this.metrics.setTimes, 50),
        p95SetTime: this.calculatePercentile(this.metrics.setTimes, 95),
        p99SetTime: this.calculatePercentile(this.metrics.setTimes, 99),
      },
    };
  }

  /**
   * 평균 계산
   */
  private calculateAverage(values: number[]): number | undefined {
    if (values.length === 0) return undefined;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * 백분위수 계산
   */
  private calculatePercentile(values: number[], percentile: number): number | undefined {
    if (values.length === 0) return undefined;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * 메트릭 출력 (로깅용)
   */
  printMetrics(): void {
    const metrics = this.getMetrics();

    console.log('=== 캐시 메트릭 ===');
    console.log(`히트: ${metrics.hits}`);
    console.log(`미스: ${metrics.misses}`);
    console.log(`히트율: ${(metrics.hitRate * 100).toFixed(2)}%`);
    console.log(`저장: ${metrics.sets}`);
    console.log(`삭제: ${metrics.deletes}`);

    if (metrics.avgGetTime) {
      console.log(`평균 조회 시간: ${metrics.avgGetTime.toFixed(2)}ms`);
    }

    if (metrics.avgSetTime) {
      console.log(`평균 저장 시간: ${metrics.avgSetTime.toFixed(2)}ms`);
    }

    console.log('==================');
  }
}
