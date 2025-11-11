import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheStore } from './interfaces/cache-store.interface';
import { CacheMetricsService } from './metrics/cache-metrics.service';
import { CacheMetrics } from './types/cache.types';

/**
 * 캐시 서비스
 *
 * CacheStore 인터페이스를 추상화하여 고수준 캐싱 API를 제공합니다.
 *
 * 주요 기능:
 * - 자동 TTL 적용
 * - Get-or-Set 패턴 (remember)
 * - 다중 키 조회/저장 (mget/mset)
 * - 타입 안전성 보장
 * - 성능 메트릭 추적
 *
 * 사용 예시:
 * ```typescript
 * @Injectable()
 * export class UsersService {
 *   constructor(private readonly cache: CacheService) {}
 *
 *   async findOne(id: string) {
 *     return this.cache.remember(`user:${id}`, 3600, async () => {
 *       return this.prisma.user.findUnique({ where: { id } });
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class CacheService {
  private readonly defaultTtl: number;
  private readonly metricsEnabled: boolean;

  constructor(
    @Inject('CACHE_STORE') private readonly store: CacheStore,
    private readonly configService: ConfigService,
    @Optional() private readonly metricsService?: CacheMetricsService,
  ) {
    this.defaultTtl = this.configService.get<number>('cache.ttl', 3600);
    this.metricsEnabled = !!metricsService;
  }

  /**
   * 캐시 값 조회
   *
   * @param key 캐시 키
   * @returns 캐시된 값 또는 null
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      const value = await this.store.get(key);

      // 메트릭 기록
      if (this.metricsEnabled) {
        const elapsed = Date.now() - startTime;
        this.metricsService!.recordGetTime(elapsed);

        if (value !== null) {
          this.metricsService!.recordHit();
        } else {
          this.metricsService!.recordMiss();
        }
      }

      return value;
    } catch (error) {
      if (this.metricsEnabled) {
        this.metricsService!.recordMiss();
      }
      throw error;
    }
  }

  /**
   * 캐시 값 저장
   *
   * @param key 캐시 키
   * @param value 저장할 값
   * @param ttl TTL(초 단위, 기본값: 3600)
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();

    await this.store.set(key, value, ttl ?? this.defaultTtl);

    // 메트릭 기록
    if (this.metricsEnabled) {
      const elapsed = Date.now() - startTime;
      this.metricsService!.recordSetTime(elapsed);
      this.metricsService!.recordSet();
    }
  }

  /**
   * Get-or-Set 패턴 (Cache-Aside)
   *
   * 캐시에 값이 있으면 반환하고, 없으면 callback을 실행하여 결과를 캐싱합니다.
   *
   * @param key 캐시 키
   * @param ttl TTL(초 단위)
   * @param callback 캐시 미스 시 실행할 함수
   * @returns 캐시된 값 또는 callback 결과
   *
   * @example
   * ```typescript
   * const user = await cache.remember('user:123', 3600, async () => {
   *   return prisma.user.findUnique({ where: { id: '123' } });
   * });
   * ```
   */
  async remember<T = any>(
    key: string,
    ttl: number,
    callback: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * 다중 키 조회 (병렬 처리)
   *
   * @param keys 캐시 키 배열
   * @returns 캐시된 값 배열 (순서 보장)
   *
   * @example
   * ```typescript
   * const [user1, user2] = await cache.mget(['user:1', 'user:2']);
   * ```
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((key) => this.get<T>(key)));
  }

  /**
   * 다중 키 저장 (병렬 처리)
   *
   * @param entries 캐시 항목 배열
   *
   * @example
   * ```typescript
   * await cache.mset([
   *   { key: 'user:1', value: user1, ttl: 3600 },
   *   { key: 'user:2', value: user2, ttl: 7200 },
   * ]);
   * ```
   */
  async mset<T = any>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    await Promise.all(
      entries.map((entry) => this.set(entry.key, entry.value, entry.ttl)),
    );
  }

  /**
   * 캐시 값 삭제
   *
   * @param key 캐시 키
   * @returns 삭제 성공 여부
   */
  async delete(key: string): Promise<boolean> {
    const result = await this.store.delete(key);

    // 메트릭 기록
    if (this.metricsEnabled) {
      this.metricsService!.recordDelete();
    }

    return result;
  }

  /**
   * 다중 키 삭제 (병렬 처리)
   *
   * @param keys 캐시 키 배열
   * @returns 삭제된 키의 개수
   *
   * @example
   * ```typescript
   * await cache.mdel(['user:1', 'user:2', 'user:3']);
   * ```
   */
  async mdel(keys: string[]): Promise<number> {
    const results = await Promise.all(keys.map((key) => this.delete(key)));
    return results.filter((r) => r).length;
  }

  /**
   * 다중 키 삭제 (별칭)
   *
   * @param keys 캐시 키 배열
   * @returns 삭제된 키의 개수
   */
  async deleteMany(keys: string[]): Promise<number> {
    return this.mdel(keys);
  }

  /**
   * 패턴 매칭 캐시 삭제
   *
   * @param pattern 정규식 패턴
   * @returns 삭제된 키의 개수
   *
   * @example
   * ```typescript
   * // 모든 사용자 캐시 삭제
   * await cache.deletePattern('^user:');
   * ```
   */
  async deletePattern(pattern: string): Promise<number> {
    return this.store.deletePattern(pattern);
  }

  /**
   * 모든 키 목록 조회
   *
   * @returns 캐시 키 배열
   */
  async keys(): Promise<string[]> {
    return this.store.keys();
  }

  /**
   * 전체 캐시 삭제
   *
   * ⚠️ 주의: 모든 캐시가 삭제됩니다.
   */
  async clear(): Promise<void> {
    await this.store.clear();
  }

  /**
   * 캐시 항목 개수
   *
   * @returns 캐시 항목 수
   */
  async size(): Promise<number> {
    return this.store.size();
  }

  /**
   * 연결 상태 확인
   *
   * @returns 연결 성공 여부
   */
  async isConnected(): Promise<boolean> {
    return this.store.isConnected();
  }

  /**
   * 캐시 키 존재 여부 확인
   *
   * @param key 캐시 키
   * @returns 존재 여부
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * 캐시 값 증가 (숫자 값만 지원)
   *
   * @param key 캐시 키
   * @param increment 증가량 (기본값: 1)
   * @param ttl TTL(초 단위) (기본값: 3600)
   * @returns 증가 후 값
   *
   * @example
   * ```typescript
   * // 조회수 증가
   * const viewCount = await cache.increment('post:123:views', 1, 3600);
   * ```
   */
  async increment(key: string, increment: number = 1, ttl: number = 3600): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const newValue = current + increment;
    await this.set(key, newValue, ttl);
    return newValue;
  }

  /**
   * 캐시 값 감소 (숫자 값만 지원)
   *
   * @param key 캐시 키
   * @param decrement 감소량 (기본값: 1)
   * @param ttl TTL(초 단위) (기본값: 3600)
   * @returns 감소 후 값
   */
  async decrement(key: string, decrement: number = 1, ttl: number = 3600): Promise<number> {
    return this.increment(key, -decrement, ttl);
  }

  /**
   * 캐시 갱신 (TTL만 갱신)
   *
   * @param key 캐시 키
   * @param ttl 새로운 TTL(초 단위)
   * @returns 갱신 성공 여부
   */
  async touch(key: string, ttl: number): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) {
      return false;
    }

    await this.set(key, value, ttl);
    return true;
  }

  /**
   * 캐시 메트릭 조회
   *
   * @returns 캐시 성능 메트릭 (메트릭 비활성화 시 null)
   */
  getMetrics(): CacheMetrics | null {
    if (!this.metricsEnabled || !this.metricsService) {
      return null;
    }

    return this.metricsService.getMetrics();
  }

  /**
   * 메트릭 초기화
   */
  resetMetrics(): void {
    if (this.metricsEnabled && this.metricsService) {
      this.metricsService.reset();
    }
  }

  /**
   * 메트릭 출력 (로깅용)
   */
  printMetrics(): void {
    if (this.metricsEnabled && this.metricsService) {
      this.metricsService.printMetrics();
    }
  }
}
