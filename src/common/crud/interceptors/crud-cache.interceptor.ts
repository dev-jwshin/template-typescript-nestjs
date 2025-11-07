import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * CRUD 캐싱 인터셉터
 *
 * 조회 작업(GET) 결과를 캐싱하고, 변경 작업(POST/PATCH/DELETE)시 캐시를 무효화합니다.
 *
 * 기능:
 * - GET 요청: 캐시 조회 → 캐시 히트 시 즉시 반환
 * - POST/PATCH/DELETE: 캐시 무효화 (해당 리소스의 모든 캐시 삭제)
 *
 * 프로덕션 권장:
 * - Redis 기반 캐싱 (cache-manager + cache-manager-redis-store)
 * - TTL 설정 (기본: 300초)
 *
 * 사용 예시:
 * ```typescript
 * @Controller('users')
 * @UseInterceptors(CrudCacheInterceptor)
 * export class UsersController {
 *   // ...
 * }
 * ```
 */
@Injectable()
export class CrudCacheInterceptor implements NestInterceptor {
  /**
   * 인메모리 캐시 저장소
   * 프로덕션 환경에서는 Redis로 교체 권장
   */
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();

  /**
   * 기본 TTL (초 단위)
   */
  private readonly DEFAULT_TTL = 300; // 5분

  /**
   * 인터셉터 실행
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // GET 요청: 캐시 조회
    if (method === 'GET') {
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache.get(cacheKey);

      // 캐시 히트 && TTL 유효
      if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
        console.log(`[Cache] HIT: ${cacheKey}`);
        return of(cached.data);
      }

      console.log(`[Cache] MISS: ${cacheKey}`);

      // 캐시 미스: 요청 실행 후 캐시 저장
      return next.handle().pipe(
        tap((response) => {
          this.cache.set(cacheKey, {
            data: response,
            timestamp: Date.now(),
            ttl: this.DEFAULT_TTL,
          });
          console.log(`[Cache] STORED: ${cacheKey}`);
        }),
      );
    }

    // POST/PATCH/DELETE: 캐시 무효화
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap(() => {
          this.invalidateCache(request);
        }),
      );
    }

    // 기타 메서드: 캐싱 없이 실행
    return next.handle();
  }

  /**
   * 캐시 키 생성
   *
   * URL + 쿼리 파라미터를 조합하여 고유 키 생성
   *
   * @param request Express Request
   * @returns 캐시 키
   */
  private generateCacheKey(request: any): string {
    const url = request.url;
    const query = JSON.stringify(request.query);
    return `${url}?${query}`;
  }

  /**
   * 캐시 무효화
   *
   * 해당 리소스의 모든 캐시를 삭제합니다.
   * 예: POST /users → /users로 시작하는 모든 캐시 삭제
   *
   * @param request Express Request
   */
  private invalidateCache(request: any): void {
    const baseUrl = request.baseUrl + request.path.split('/')[0];
    let invalidatedCount = 0;

    this.cache.forEach((_, key) => {
      if (key.startsWith(baseUrl)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    });

    if (invalidatedCount > 0) {
      console.log(
        `[Cache] INVALIDATED: ${invalidatedCount} keys for ${baseUrl}`,
      );
    }
  }

  /**
   * 캐시 전체 초기화 (디버그용)
   */
  clearAll(): void {
    this.cache.clear();
    console.log('[Cache] CLEARED ALL');
  }

  /**
   * 캐시 통계 조회 (디버그용)
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
