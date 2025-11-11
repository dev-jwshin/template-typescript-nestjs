/**
 * Cacheable 데코레이터
 *
 * 메서드 결과를 자동으로 캐싱합니다.
 *
 * 사용 예시:
 * ```typescript
 * @Injectable()
 * export class UsersService {
 *   constructor(private readonly cache: CacheService) {}
 *
 *   @Cacheable({ key: (id) => `user:${id}`, ttl: 3600 })
 *   async findOne(id: string): Promise<User> {
 *     return this.prisma.user.findUnique({ where: { id } });
 *   }
 * }
 * ```
 */

interface CacheableOptions {
  /**
   * 캐시 키 생성 함수
   * @param args 메서드 인자
   */
  key: ((...args: any[]) => string) | string;

  /**
   * TTL (초 단위)
   * @default 3600
   */
  ttl?: number;

  /**
   * 캐시 태그
   */
  tags?: string[];
}

/**
 * Cacheable 데코레이터
 */
export function Cacheable(options: CacheableOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cache;

      if (!cacheService) {
        console.warn(
          `[Cacheable] CacheService not found in ${target.constructor.name}`,
        );
        return originalMethod.apply(this, args);
      }

      // 캐시 키 생성
      const cacheKey =
        typeof options.key === 'function' ? options.key(...args) : options.key;

      const ttl = options.ttl ?? 3600;

      // remember() 패턴 사용
      return cacheService.remember(cacheKey, ttl, async () => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

/**
 * CacheInvalidate 데코레이터
 *
 * 메서드 실행 후 특정 캐시 키를 무효화합니다.
 */
export function CacheInvalidate(options: {
  key: ((...args: any[]) => string) | string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const cacheService = this.cache;
      if (cacheService) {
        const cacheKey =
          typeof options.key === 'function' ? options.key(...args) : options.key;
        await cacheService.delete(cacheKey);
      }

      return result;
    };

    return descriptor;
  };
}
