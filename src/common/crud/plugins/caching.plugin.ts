import { Inject } from '@nestjs/common';
import { CrudPlugin } from './crud-plugin.interface';
import { CrudConfig } from '../types/crud-config.interface';
import { CrudOperation } from '../types/crud-operation.enum';
import { CrudHookContext } from '../types/crud-hook.interface';
import { CacheStore } from '../../cache/interfaces/cache-store.interface';

/**
 * 캐싱 플러그인
 *
 * Index/Show 작업의 결과를 자동으로 캐싱합니다.
 *
 * 기능:
 * - 조회 결과 자동 캐싱
 * - TTL(Time To Live) 기반 만료
 * - CUD 작업 시 자동 캐시 무효화
 * - 캐시 키 커스터마이징 가능
 *
 * 사용 예시:
 * ```typescript
 * @Crud({
 *   only: [CrudOperation.Index, CrudOperation.Show],
 *   plugins: [
 *     withOptions(CachingPlugin, {
 *       ttl: 300, // 5분
 *       keyPrefix: 'users',
 *     }),
 *   ],
 * })
 * ```
 *
 * 캐시 저장소:
 * - 개발: 메모리 (Map)
 * - 프로덕션: Redis 권장
 */

/**
 * 캐싱 플러그인 옵션
 */
export interface CachingPluginOptions {
  /**
   * TTL(Time To Live) - 초 단위
   * @default 300 (5분)
   */
  ttl?: number;

  /**
   * 캐시 키 접두사
   * @default 'crud'
   */
  keyPrefix?: string;

  /**
   * Index 작업 캐싱 여부
   * @default true
   */
  cacheIndex?: boolean;

  /**
   * Show 작업 캐싱 여부
   * @default true
   */
  cacheShow?: boolean;

  /**
   * CUD 작업 시 캐시 무효화 여부
   * @default true
   */
  invalidateOnMutation?: boolean;
}

/**
 * 캐시 엔트리
 */
interface CacheEntry {
  data: any;
  expiresAt: number;
}

/**
 * 간단한 메모리 캐시 저장소
 * 프로덕션에서는 Redis 사용 권장
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * 캐시 조회
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 만료 체크
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 캐시 저장
   */
  set(key: string, data: any, ttl: number): void {
    const expiresAt = Date.now() + ttl * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * 캐시 삭제
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 패턴 매칭 캐시 삭제
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 전체 캐시 삭제
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 캐시 크기
   */
  size(): number {
    return this.cache.size;
  }
}

// 전역 캐시 인스턴스
const globalCache = new MemoryCache();

/**
 * 캐싱 플러그인 팩토리
 */
export function withCachingOptions(
  options: CachingPluginOptions = {},
): CrudPlugin {
  const {
    ttl = 300,
    keyPrefix = 'crud',
    cacheIndex = true,
    cacheShow = true,
    invalidateOnMutation = true,
  } = options;

  return {
    name: 'caching',
    version: '1.0.0',
    description: 'CRUD 조회 결과 자동 캐싱 플러그인',

    /**
     * 플러그인 초기화
     */
    init(config: CrudConfig) {
      console.log(
        `[CachingPlugin] Initialized for resource: ${config.resourceType || 'unknown'}`,
      );
      console.log(`[CachingPlugin] TTL: ${ttl}s, KeyPrefix: ${keyPrefix}`);
    },

    /**
     * 훅 등록
     */
    registerHooks() {
      return {
        // 조회 후 캐싱
        after: {
          ...(cacheIndex && {
            [CrudOperation.Index]: async (
              data: any,
              context: CrudHookContext,
            ) => {
              const cacheKey = generateCacheKey(
                keyPrefix,
                'index',
                context.request?.query,
              );
              globalCache.set(cacheKey, data, ttl);

              if (process.env.NODE_ENV !== 'production') {
                console.log(`[CachingPlugin] Cached Index: ${cacheKey}`);
              }

              return data;
            },
          }),

          ...(cacheShow && {
            [CrudOperation.Show]: async (
              data: any,
              context: CrudHookContext,
            ) => {
              const id = context.request?.params?.id;
              const cacheKey = generateCacheKey(keyPrefix, 'show', id);
              globalCache.set(cacheKey, data, ttl);

              if (process.env.NODE_ENV !== 'production') {
                console.log(`[CachingPlugin] Cached Show: ${cacheKey}`);
              }

              return data;
            },
          }),
        },

        // CUD 작업 후 캐시 무효화
        ...(invalidateOnMutation && {
          after: {
            [CrudOperation.Create]: async (
              data: any,
              context: CrudHookContext,
            ) => {
              invalidateCache(keyPrefix);
              return data;
            },

            [CrudOperation.Update]: async (
              data: any,
              context: CrudHookContext,
            ) => {
              invalidateCache(keyPrefix);
              return data;
            },

            [CrudOperation.Delete]: async (
              data: any,
              context: CrudHookContext,
            ) => {
              invalidateCache(keyPrefix);
              return data;
            },
          },
        }),
      };
    },

    /**
     * 플러그인 정리
     */
    destroy() {
      // 리소스별 캐시만 삭제
      globalCache.deletePattern(`^${keyPrefix}:`);
      console.log(`[CachingPlugin] Cleaned up cache for: ${keyPrefix}`);
    },
  };
}

/**
 * 기본 캐싱 플러그인 (기본 옵션)
 */
export const CachingPlugin: CrudPlugin = withCachingOptions();

/**
 * 캐시 키 생성
 */
function generateCacheKey(
  prefix: string,
  operation: string,
  params?: any,
): string {
  const paramsStr = params ? JSON.stringify(params) : '';
  const hash = simpleHash(paramsStr);
  return `${prefix}:${operation}:${hash}`;
}

/**
 * 간단한 해시 함수
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 캐시 무효화
 */
function invalidateCache(prefix: string): void {
  globalCache.deletePattern(`^${prefix}:`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[CachingPlugin] Invalidated cache: ${prefix}`);
  }
}

/**
 * 캐시 통계 조회 (디버깅용)
 */
export function getCacheStats() {
  return {
    size: globalCache.size(),
    entries: Array.from((globalCache as any).cache.keys()),
  };
}

/**
 * 수동 캐시 삭제 (디버깅/관리용)
 */
export function clearCache(pattern?: string) {
  if (pattern) {
    globalCache.deletePattern(pattern);
  } else {
    globalCache.clear();
  }
}
