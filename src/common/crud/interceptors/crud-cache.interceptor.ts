import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of, from } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { CacheStore } from '../../cache/interfaces/cache-store.interface';

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
 * - Redis 기반 캐싱 (CACHE_DRIVER=redis)
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
   * 기본 TTL (초 단위)
   */
  private readonly DEFAULT_TTL = parseInt(
    process.env.REDIS_TTL || '300',
    10,
  );

  constructor(
    @Inject('CACHE_STORE') private readonly cacheStore: CacheStore,
  ) {}

  /**
   * 인터셉터 실행
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // GET 요청: 캐시 조회
    if (method === 'GET') {
      const cacheKey = this.generateCacheKey(request);

      return from(this.cacheStore.get(cacheKey)).pipe(
        switchMap((cached) => {
          // 캐시 히트
          if (cached) {
            console.log(`[Cache] HIT: ${cacheKey}`);
            return of(cached);
          }

          console.log(`[Cache] MISS: ${cacheKey}`);

          // 캐시 미스: 요청 실행 후 캐시 저장
          return next.handle().pipe(
            tap(async (response) => {
              await this.cacheStore.set(cacheKey, response, this.DEFAULT_TTL);
              console.log(`[Cache] STORED: ${cacheKey} (TTL: ${this.DEFAULT_TTL}s)`);
            }),
          );
        }),
      );
    }

    // POST/PATCH/DELETE: 캐시 무효화
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap(async () => {
          await this.invalidateCache(request);
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
  private async invalidateCache(request: any): Promise<void> {
    const baseUrl = request.baseUrl + request.path.split('/')[0];
    const pattern = `${baseUrl}*`;

    await this.cacheStore.deletePattern(pattern);

    console.log(`[Cache] INVALIDATED: pattern "${pattern}"`);
  }

  /**
   * 캐시 전체 초기화 (디버그용)
   */
  async clearAll(): Promise<void> {
    await this.cacheStore.clear();
    console.log('[Cache] CLEARED ALL');
  }

  /**
   * 캐시 통계 조회 (디버그용)
   */
  async getStats(): Promise<{ size: number; connected: boolean }> {
    return {
      size: await this.cacheStore.size(),
      connected: await this.cacheStore.isConnected(),
    };
  }
}
