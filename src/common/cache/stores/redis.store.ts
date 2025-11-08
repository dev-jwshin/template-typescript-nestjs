import Redis from 'ioredis';
import { CacheStore } from '../interfaces/cache-store.interface';

/**
 * Redis 캐시 저장소
 *
 * 프로덕션 환경과 분산 시스템에 적합합니다.
 *
 * 특징:
 * - 영속성 지원 (서버 재시작 시에도 캐시 유지)
 * - 분산 환경 지원 (여러 인스턴스 간 캐시 공유)
 * - 고성능 & 고가용성
 * - TTL 자동 관리
 *
 * 사용 예시:
 * ```typescript
 * const store = new RedisStore({
 *   host: 'localhost',
 *   port: 6379,
 *   password: 'secret',
 *   db: 0,
 * });
 * ```
 */
export class RedisStore implements CacheStore {
  private client: Redis;
  private isReady: boolean = false;

  constructor(config: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  }) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
      db: config.db || 0,
      retryStrategy: (times) => {
        // 최대 10회 재시도, 지수 백오프 적용
        if (times > 10) {
          console.error('[RedisStore] 최대 재시도 횟수 초과, 연결 포기');
          return null;
        }
        const delay = Math.min(times * 100, 3000);
        console.warn(
          `[RedisStore] 재연결 시도 ${times}회... (${delay}ms 후)`,
        );
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true, // 명시적 연결 제어
    });

    // 이벤트 리스너 등록
    this.client.on('connect', () => {
      console.log(
        `[RedisStore] Redis 서버 연결 성공: ${config.host}:${config.port}`,
      );
    });

    this.client.on('ready', () => {
      this.isReady = true;
      console.log('[RedisStore] Redis 클라이언트 준비 완료');
    });

    this.client.on('error', (err) => {
      this.isReady = false;
      console.error('[RedisStore] Redis 연결 에러:', err.message);
    });

    this.client.on('close', () => {
      this.isReady = false;
      console.warn('[RedisStore] Redis 연결 종료');
    });

    this.client.on('reconnecting', () => {
      console.log('[RedisStore] Redis 재연결 중...');
    });

    // 연결 시도
    this.connect();
  }

  /**
   * Redis 서버 연결
   */
  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error('[RedisStore] 초기 연결 실패:', error.message);
      throw error;
    }
  }

  /**
   * 캐시 값 조회
   */
  async get(key: string): Promise<any | null> {
    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      // JSON 파싱 시도 (객체가 저장된 경우)
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`[RedisStore] get("${key}") 실패:`, error.message);
      return null;
    }
  }

  /**
   * 캐시 값 저장
   */
  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      // 객체는 JSON 직렬화
      const serialized =
        typeof value === 'object' ? JSON.stringify(value) : String(value);

      await this.client.setex(key, ttl, serialized);
    } catch (error) {
      console.error(`[RedisStore] set("${key}") 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 캐시 값 삭제
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`[RedisStore] delete("${key}") 실패:`, error.message);
    }
  }

  /**
   * 패턴 매칭 캐시 삭제
   *
   * Redis SCAN 명령을 사용하여 안전하게 키를 검색합니다.
   * 대용량 키셋에서도 서버 블로킹 없이 동작합니다.
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      const keysToDelete: string[] = [];

      do {
        // SCAN으로 키 검색 (논블로킹)
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keysToDelete.push(...keys);
      } while (cursor !== '0');

      // 일괄 삭제
      if (keysToDelete.length > 0) {
        await this.client.del(...keysToDelete);
        console.log(
          `[RedisStore] 패턴 "${pattern}" 매칭 키 ${keysToDelete.length}개 삭제`,
        );
      }
    } catch (error) {
      console.error(
        `[RedisStore] deletePattern("${pattern}") 실패:`,
        error.message,
      );
    }
  }

  /**
   * 전체 캐시 삭제
   *
   * ⚠️ 주의: 현재 DB의 모든 키가 삭제됩니다.
   */
  async clear(): Promise<void> {
    try {
      await this.client.flushdb();
      console.log('[RedisStore] 전체 캐시 삭제 완료');
    } catch (error) {
      console.error('[RedisStore] clear() 실패:', error.message);
    }
  }

  /**
   * 캐시 항목 개수
   */
  async size(): Promise<number> {
    try {
      return await this.client.dbsize();
    } catch (error) {
      console.error('[RedisStore] size() 실패:', error.message);
      return 0;
    }
  }

  /**
   * 연결 상태 확인
   */
  async isConnected(): Promise<boolean> {
    return this.isReady && this.client.status === 'ready';
  }

  /**
   * Redis 연결 종료
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      console.log('[RedisStore] Redis 연결 정상 종료');
    } catch (error) {
      console.error('[RedisStore] disconnect() 실패:', error.message);
    }
  }

  /**
   * 디버깅: 서버 정보 조회
   */
  async getInfo(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      console.error('[RedisStore] getInfo() 실패:', error.message);
      return '';
    }
  }

  /**
   * 디버깅: 특정 패턴의 모든 키 조회
   */
  async getKeys(pattern: string = '*'): Promise<string[]> {
    try {
      let cursor = '0';
      const allKeys: string[] = [];

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        allKeys.push(...keys);
      } while (cursor !== '0');

      return allKeys;
    } catch (error) {
      console.error(`[RedisStore] getKeys("${pattern}") 실패:`, error.message);
      return [];
    }
  }
}
