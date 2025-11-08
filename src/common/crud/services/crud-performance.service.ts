import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { PerformanceConfig } from '../types/performance-config.interface';
import { CrudRequest } from '../types/crud-request.interface';
import { CrudOperation } from '../types/crud-operation.enum';

/**
 * CRUD 성능 최적화 서비스
 *
 * 쿼리 최적화, 캐싱, 스트리밍 등을 지원합니다.
 */
@Injectable()
export class CrudPerformanceService {
  /**
   * 캐시 저장소
   */
  private cacheStore = new Map<string, CacheEntry>();

  /**
   * 쿼리에 Eager Loading 적용
   *
   * @param allowedIncludes 허용된 include 목록
   * @param requestedIncludes 요청된 include 목록
   * @returns Eager Loading 쿼리 옵션
   */
  applyEagerLoading(
    allowedIncludes: string[] = [],
    requestedIncludes: string[] = [],
  ): Record<string, any> {
    const includes: Record<string, any> = {};

    for (const include of requestedIncludes) {
      if (allowedIncludes.includes(include)) {
        // 중첩 관계 처리 (예: 'profile.avatar')
        const parts = include.split('.');
        let current = includes;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];

          if (i === parts.length - 1) {
            // 마지막 부분
            current[part] = true;
          } else {
            // 중첩 관계
            if (!current[part]) {
              current[part] = { include: {} };
            }
            current = current[part].include;
          }
        }
      }
    }

    return includes;
  }

  /**
   * 쿼리 타임아웃 적용
   *
   * @param queryPromise 쿼리 Promise
   * @param timeout 타임아웃 (밀리초)
   * @returns 타임아웃이 적용된 Promise
   */
  async applyQueryTimeout<T>(
    queryPromise: Promise<T>,
    timeout?: number,
  ): Promise<T> {
    if (!timeout) {
      return queryPromise;
    }

    return Promise.race([
      queryPromise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new RequestTimeoutException(
                `Query timeout after ${timeout}ms`,
              ),
            ),
          timeout,
        ),
      ),
    ]);
  }

  /**
   * 캐시 조회
   *
   * @param config 성능 설정
   * @param req CRUD 요청
   * @returns 캐시된 데이터 (없으면 null)
   */
  getCache<T>(config: PerformanceConfig, req: CrudRequest): T | null {
    if (!config.cache?.enabled) {
      return null;
    }

    const key = this.generateCacheKey(config, req);
    const entry = this.cacheStore.get(key);

    if (!entry) {
      return null;
    }

    // TTL 체크
    const now = Date.now();
    if (entry.expiresAt && now > entry.expiresAt) {
      this.cacheStore.delete(key);
      return null;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CrudPerformance] Cache hit: ${key}`);
    }

    return entry.data as T;
  }

  /**
   * 캐시 저장
   *
   * @param config 성능 설정
   * @param req CRUD 요청
   * @param data 캐시할 데이터
   */
  setCache<T>(config: PerformanceConfig, req: CrudRequest, data: T): void {
    if (!config.cache?.enabled) {
      return;
    }

    const key = this.generateCacheKey(config, req);
    const ttl = config.cache.ttl || 300; // 기본 5분
    const expiresAt = Date.now() + ttl * 1000;

    this.cacheStore.set(key, {
      data,
      expiresAt,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CrudPerformance] Cache set: ${key} (TTL: ${ttl}s)`);
    }
  }

  /**
   * 캐시 무효화
   *
   * @param config 성능 설정
   * @param operation 실행된 CRUD 작업
   * @param resourcePattern 리소스 패턴 (예: 'users')
   */
  invalidateCache(
    config: PerformanceConfig,
    operation: CrudOperation,
    resourcePattern: string,
  ): void {
    if (!config.cache?.enabled) {
      return;
    }

    const invalidateOps = config.cache.invalidateOn || [
      CrudOperation.Create,
      CrudOperation.Update,
      CrudOperation.Delete,
    ];

    if (!invalidateOps.includes(operation)) {
      return;
    }

    // 패턴 매칭으로 캐시 삭제
    let deletedCount = 0;
    for (const key of this.cacheStore.keys()) {
      if (key.includes(resourcePattern)) {
        this.cacheStore.delete(key);
        deletedCount++;
      }
    }

    if (process.env.NODE_ENV !== 'production' && deletedCount > 0) {
      console.log(
        `[CrudPerformance] Invalidated ${deletedCount} cache entries for: ${resourcePattern}`,
      );
    }
  }

  /**
   * 캐시 키 생성
   *
   * @param config 성능 설정
   * @param req CRUD 요청
   * @returns 캐시 키
   */
  private generateCacheKey(
    config: PerformanceConfig,
    req: CrudRequest,
  ): string {
    const strategy = config.cache?.keyStrategy || 'simple';

    if (strategy === 'custom' && config.cache?.keyGenerator) {
      return config.cache.keyGenerator(req);
    }

    const resource = req.req.route?.path || 'unknown';

    // paramsFilter에서 id 추출 (예: /users/:id)
    const idParam = req.parsed?.paramsFilter?.find(p => p.field === 'id');
    const id = idParam?.value;

    if (strategy === 'simple') {
      return id ? `${resource}:${id}` : resource;
    }

    // query-based - filter, sort, page 등을 포함
    const queryData = {
      filter: req.parsed?.filter,
      sort: req.parsed?.sort,
      page: req.parsed?.page,
      join: req.parsed?.join,
      search: req.parsed?.search,
    };
    const queryStr = JSON.stringify(queryData);
    const hash = this.simpleHash(queryStr);

    return id ? `${resource}:${id}:${hash}` : `${resource}:${hash}`;
  }

  /**
   * 간단한 해시 함수
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 데이터 스트리밍
   *
   * 대용량 데이터를 청크 단위로 나누어 전송합니다.
   *
   * @param data 전체 데이터
   * @param chunkSize 청크 크기
   * @returns AsyncGenerator
   */
  async *streamData<T>(
    data: T[],
    chunkSize: number = 100,
  ): AsyncGenerator<T[], void, unknown> {
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      yield chunk;

      // 다음 이벤트 루프에 양보
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  /**
   * 캐시 통계
   */
  getCacheStats() {
    return {
      size: this.cacheStore.size,
      entries: Array.from(this.cacheStore.keys()),
    };
  }

  /**
   * 캐시 초기화
   */
  clearCache() {
    this.cacheStore.clear();
  }
}

/**
 * 캐시 엔트리
 */
interface CacheEntry {
  data: any;
  expiresAt: number;
}
