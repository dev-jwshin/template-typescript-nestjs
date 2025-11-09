import { CrudPlugin } from './crud-plugin.interface';
import { CrudConfig } from '../types/crud-config.interface';
import { CrudOperation } from '../types/crud-operation.enum';
import { CrudHookContext } from '../types/crud-hook.interface';
import { BadRequestException } from '@nestjs/common';

/**
 * Rate Limit 플러그인
 *
 * API 요청 빈도를 제한하여 과도한 사용을 방지합니다.
 *
 * 기능:
 * - IP 기반 요청 제한
 * - 사용자 기반 요청 제한
 * - 슬라이딩 윈도우 알고리즘
 * - 커스텀 제한 규칙
 *
 * 사용 예시:
 * ```typescript
 * @Crud({
 *   only: [CrudOperation.Create, CrudOperation.Update, CrudOperation.Delete],
 *   plugins: [
 *     withRateLimitOptions({
 *       maxRequests: 100,
 *       windowMs: 60000, // 1분
 *       keyGenerator: (context) => context.user?.id || context.ip,
 *     }),
 *   ],
 * })
 * ```
 *
 * Rate Limit 전략:
 * - Sliding Window: 정확한 제한, 높은 메모리 사용
 * - Fixed Window: 빠름, 경계에서 요청 급증 가능
 */

/**
 * Rate Limit 플러그인 옵션
 */
export interface RateLimitPluginOptions {
  /**
   * 최대 요청 횟수
   * @default 100
   */
  maxRequests?: number;

  /**
   * 시간 윈도우 (밀리초)
   * @default 60000 (1분)
   */
  windowMs?: number;

  /**
   * Rate Limit 적용 작업
   * @default [Create, Update, Delete]
   */
  operations?: CrudOperation[];

  /**
   * 키 생성 함수 (IP 또는 사용자 ID 등)
   * @default (context) => context.ip
   */
  keyGenerator?: (context: CrudHookContext) => string;

  /**
   * Rate Limit 초과 시 에러 메시지
   * @default 'Too many requests, please try again later.'
   */
  message?: string;

  /**
   * Rate Limit 헤더 추가 여부
   * @default true
   */
  addHeaders?: boolean;

  /**
   * 화이트리스트 IP 목록
   */
  whitelist?: string[];

  /**
   * 블랙리스트 IP 목록
   */
  blacklist?: string[];
}

/**
 * Rate Limit 레코드
 */
interface RateLimitRecord {
  /**
   * 요청 타임스탬프 배열
   */
  requests: number[];

  /**
   * 마지막 리셋 시간
   */
  resetAt: number;
}

/**
 * Rate Limit 저장소
 */
class RateLimitStore {
  private store = new Map<string, RateLimitRecord>();

  /**
   * 요청 기록 및 제한 체크
   *
   * @returns 허용 여부
   */
  checkAndRecord(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): {
    allowed: boolean;
    current: number;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;

    // 기존 레코드 가져오기
    let record = this.store.get(key);

    if (!record) {
      // 새 레코드 생성
      record = {
        requests: [],
        resetAt: now + windowMs,
      };
      this.store.set(key, record);
    }

    // 윈도우 밖의 요청 제거 (슬라이딩 윈도우)
    record.requests = record.requests.filter((time) => time > windowStart);

    // 현재 요청 수
    const current = record.requests.length;

    // Rate Limit 체크
    if (current >= maxRequests) {
      return {
        allowed: false,
        current,
        remaining: 0,
        resetAt: record.resetAt,
      };
    }

    // 요청 기록
    record.requests.push(now);

    // 리셋 시간 갱신
    if (now >= record.resetAt) {
      record.resetAt = now + windowMs;
    }

    return {
      allowed: true,
      current: current + 1,
      remaining: maxRequests - current - 1,
      resetAt: record.resetAt,
    };
  }

  /**
   * 특정 키 삭제
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * 전체 삭제
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * 만료된 레코드 정리
   */
  cleanup(windowMs: number): void {
    const now = Date.now();
    const windowStart = now - windowMs;

    for (const [key, record] of this.store.entries()) {
      // 모든 요청이 윈도우 밖이면 삭제
      const validRequests = record.requests.filter(
        (time) => time > windowStart,
      );

      if (validRequests.length === 0) {
        this.store.delete(key);
      }
    }
  }

  /**
   * 저장소 크기
   */
  size(): number {
    return this.store.size;
  }
}

// 전역 Rate Limit 저장소
const globalStore = new RateLimitStore();

// 주기적인 정리 (5분마다)
setInterval(() => {
  globalStore.cleanup(300000); // 5분
}, 300000).unref(); // Jest가 이 타이머 때문에 종료되지 않는 것을 방지

/**
 * Rate Limit 플러그인 팩토리
 */
export function withRateLimitOptions(
  options: RateLimitPluginOptions = {},
): CrudPlugin {
  const {
    maxRequests = 100,
    windowMs = 60000,
    operations = [
      CrudOperation.Create,
      CrudOperation.Update,
      CrudOperation.Delete,
    ],
    keyGenerator = (context: CrudHookContext) => context.ip || 'unknown',
    message = 'Too many requests, please try again later.',
    addHeaders = true,
    whitelist = [],
    blacklist = [],
  } = options;

  return {
    name: 'rate-limit',
    version: '1.0.0',
    description: 'API 요청 빈도 제한 플러그인',

    /**
     * 플러그인 초기화
     */
    init(config: CrudConfig) {
      console.log(
        `[RateLimitPlugin] Initialized for resource: ${config.resourceType || 'unknown'}`,
      );
      console.log(
        `[RateLimitPlugin] Max: ${maxRequests} requests per ${windowMs}ms`,
      );
    },

    /**
     * 훅 등록
     */
    registerHooks() {
      const hooks: any = {
        before: {},
      };

      // 지정된 작업에 대해 Before 훅 등록
      for (const operation of operations) {
        hooks.before[operation] = async (
          data: any,
          context: CrudHookContext,
        ) => {
          // 키 생성
          const key = keyGenerator(context);

          // 블랙리스트 체크
          if (blacklist.includes(key)) {
            throw new BadRequestException('Access denied.');
          }

          // 화이트리스트 체크
          if (whitelist.includes(key)) {
            return data; // Rate Limit 건너뛰기
          }

          // Rate Limit 체크
          const result = globalStore.checkAndRecord(key, maxRequests, windowMs);

          // 헤더 추가
          if (addHeaders && context.request?.res) {
            const response = context.request.res;
            response.setHeader('X-RateLimit-Limit', maxRequests.toString());
            response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
            response.setHeader(
              'X-RateLimit-Reset',
              new Date(result.resetAt).toISOString(),
            );
          }

          // Rate Limit 초과
          if (!result.allowed) {
            const resetDate = new Date(result.resetAt);
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

            if (context.request?.res) {
              context.request.res.setHeader(
                'Retry-After',
                retryAfter.toString(),
              );
            }

            throw new BadRequestException({
              statusCode: 429,
              message,
              error: 'Too Many Requests',
              retryAfter,
              resetAt: resetDate.toISOString(),
            });
          }

          return data;
        };
      }

      return hooks;
    },

    /**
     * 플러그인 정리
     */
    destroy() {
      // Rate Limit 저장소는 전역으로 유지
      console.log('[RateLimitPlugin] Destroyed');
    },
  };
}

/**
 * 기본 Rate Limit 플러그인 (기본 옵션)
 */
export const RateLimitPlugin: CrudPlugin = withRateLimitOptions();

/**
 * Rate Limit 통계 조회 (디버깅용)
 */
export function getRateLimitStats() {
  return {
    size: globalStore.size(),
  };
}

/**
 * Rate Limit 초기화 (디버깅/관리용)
 */
export function resetRateLimit(key?: string) {
  if (key) {
    globalStore.delete(key);
  } else {
    globalStore.clear();
  }
}
