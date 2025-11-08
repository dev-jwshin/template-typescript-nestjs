import { CacheStore } from './interfaces/cache-store.interface';
import { MemoryStore } from './stores/memory.store';
import { RedisStore } from './stores/redis.store';

/**
 * 캐시 저장소 팩토리
 *
 * 환경 변수(CACHE_DRIVER)에 따라 적절한 캐시 저장소를 생성합니다.
 * 팩토리 패턴(Factory Pattern)을 적용하여 객체 생성 로직을 캡슐화합니다.
 */
export class CacheFactory {
  /**
   * 캐시 저장소 생성
   *
   * @returns CacheStore 인스턴스 (Memory 또는 Redis)
   * @throws Error Redis 설정이 올바르지 않을 때
   */
  static async create(): Promise<CacheStore> {
    const driver = process.env.CACHE_DRIVER || 'memory';

    console.log(`[CacheFactory] 캐시 드라이버: ${driver}`);

    if (driver === 'redis') {
      return this.createRedisStore();
    }

    return this.createMemoryStore();
  }

  /**
   * Memory 저장소 생성
   */
  private static createMemoryStore(): CacheStore {
    console.log('[CacheFactory] Memory Store 생성');
    return new MemoryStore();
  }

  /**
   * Redis 저장소 생성
   */
  private static async createRedisStore(): Promise<CacheStore> {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    };

    // 필수 설정 검증
    if (!config.host) {
      throw new Error(
        '[CacheFactory] REDIS_HOST 환경 변수가 설정되지 않았습니다',
      );
    }

    try {
      console.log(
        `[CacheFactory] Redis Store 생성 시도: ${config.host}:${config.port}`,
      );
      const store = new RedisStore(config);

      // 연결 대기 (최대 5초)
      const timeout = 5000;
      const startTime = Date.now();

      while (!(await store.isConnected())) {
        if (Date.now() - startTime > timeout) {
          throw new Error('Redis 연결 타임아웃 (5초 초과)');
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log('[CacheFactory] Redis Store 생성 완료');
      return store;
    } catch (error) {
      console.error('[CacheFactory] Redis Store 생성 실패:', error.message);
      console.warn('[CacheFactory] Memory Store로 대체합니다 (fallback)');
      return this.createMemoryStore();
    }
  }

  /**
   * 캐시 드라이버 검증
   *
   * .env 파일 설정이 올바른지 검증합니다.
   *
   * @returns 검증 결과 및 메시지
   */
  static validateConfig(): {
    valid: boolean;
    driver: string;
    messages: string[];
  } {
    const driver = process.env.CACHE_DRIVER || 'memory';
    const messages: string[] = [];

    if (driver !== 'memory' && driver !== 'redis') {
      messages.push(
        `⚠️  올바르지 않은 CACHE_DRIVER: "${driver}" (memory 또는 redis만 지원)`,
      );
      return { valid: false, driver, messages };
    }

    if (driver === 'redis') {
      const host = process.env.REDIS_HOST;
      const port = process.env.REDIS_PORT;

      if (!host) {
        messages.push('⚠️  REDIS_HOST 환경 변수가 설정되지 않았습니다');
      }

      if (!port) {
        messages.push('⚠️  REDIS_PORT 환경 변수가 설정되지 않았습니다');
      } else if (isNaN(parseInt(port, 10))) {
        messages.push(`⚠️  올바르지 않은 REDIS_PORT: "${port}"`);
      }

      if (messages.length > 0) {
        messages.push('→ Memory Store로 대체됩니다 (fallback)');
        return { valid: false, driver, messages };
      }

      messages.push(`✅ Redis 설정 확인: ${host}:${port}`);
    } else {
      messages.push('✅ Memory Store 사용');
    }

    return { valid: true, driver, messages };
  }
}
