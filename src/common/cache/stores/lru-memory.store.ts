import { LRUCache } from 'lru-cache';
import { CacheStore } from '../interfaces/cache-store.interface';

/**
 * LRU MemoryStore 옵션
 */
interface LRUMemoryStoreOptions {
  /**
   * 최대 항목 수
   * @default 500
   */
  max?: number;

  /**
   * 최대 메모리 크기 (bytes)
   * @default 104857600 (100MB)
   */
  maxSize?: number;

  /**
   * 기본 TTL (밀리초)
   * @default 3600000 (1시간)
   */
  ttl?: number;
}

/**
 * LRU (Least Recently Used) 인메모리 캐시 저장소
 *
 * 메모리 효율적인 캐시 관리를 위한 LRU 알고리즘 기반 저장소입니다.
 * 프로덕션 환경의 단일 인스턴스 애플리케이션에 적합합니다.
 *
 * 특징:
 * - LRU 알고리즘으로 자동 메모리 관리
 * - 최대 항목 수 및 메모리 크기 제한
 * - 크기 기반 자동 제거 (가장 오래 사용되지 않은 항목)
 * - 자동 TTL 관리
 * - 고성능 조회/저장
 *
 * 사용 예시:
 * ```typescript
 * const store = new LRUMemoryStore({
 *   max: 1000,          // 최대 1,000개 항목
 *   maxSize: 100 * 1024 * 1024, // 최대 100MB
 *   ttl: 3600 * 1000,   // 기본 1시간
 * });
 * ```
 */
export class LRUMemoryStore implements CacheStore {
  private cache: LRUCache<string, any>;
  private readonly options: Required<LRUMemoryStoreOptions>;

  constructor(options: LRUMemoryStoreOptions = {}) {
    this.options = {
      max: options.max ?? 500,
      maxSize: options.maxSize ?? 104857600, // 100MB
      ttl: options.ttl ?? 3600000, // 1시간
    };

    this.cache = new LRUCache<string, any>({
      max: this.options.max,
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
      // 크기 계산 함수 (JSON 직렬화 크기)
      sizeCalculation: (value) => {
        try {
          return JSON.stringify(value).length;
        } catch {
          return 0;
        }
      },
      // TTL 자동 갱신 옵션
      ttlAutopurge: true,
      // 만료된 항목 즉시 제거
      allowStale: false,
    });

    console.log(
      `[LRUMemoryStore] 초기화 완료 (최대 항목: ${this.options.max}개, 최대 크기: ${(this.options.maxSize / 1024 / 1024).toFixed(2)}MB)`,
    );
  }

  /**
   * 캐시 값 조회
   */
  async get(key: string): Promise<any | null> {
    const value = this.cache.get(key);
    return value ?? null;
  }

  /**
   * 캐시 값 저장
   */
  async set(key: string, value: any, ttl: number): Promise<void> {
    this.cache.set(key, value, { ttl: ttl * 1000 });
  }

  /**
   * 캐시 값 삭제
   *
   * @returns 삭제 성공 여부
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * 패턴 매칭 캐시 삭제
   *
   * @returns 삭제된 키의 개수
   */
  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(
        `[LRUMemoryStore] 패턴 "${pattern}" 매칭 키 ${keysToDelete.length}개 삭제`,
      );
    }

    return keysToDelete.length;
  }

  /**
   * 전체 캐시 삭제
   */
  async clear(): Promise<void> {
    this.cache.clear();
    console.log('[LRUMemoryStore] 전체 캐시 삭제 완료');
  }

  /**
   * 캐시 항목 개수
   */
  async size(): Promise<number> {
    return this.cache.size;
  }

  /**
   * 키 존재 여부 확인
   *
   * @param key - 캐시 키
   * @returns 키 존재 여부
   */
  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  /**
   * 모든 키 목록 조회
   *
   * @returns 캐시 키 배열
   */
  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  /**
   * 연결 상태 확인
   */
  async isConnected(): Promise<boolean> {
    return true;
  }

  /**
   * 모든 캐시 키 조회
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): {
    size: number;
    maxSize: number;
    calculatedSize: number;
    max: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      calculatedSize: this.cache.calculatedSize || 0,
      max: this.options.max,
    };
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    this.cache.clear();
    console.log('[LRUMemoryStore] 연결 종료 및 캐시 정리 완료');
  }

  /**
   * 특정 키의 남은 TTL 조회 (밀리초)
   */
  getRemainingTTL(key: string): number | undefined {
    return this.cache.getRemainingTTL(key);
  }

  /**
   * 특정 키가 만료되었는지 확인
   */
  isStale(key: string): boolean {
    return !this.cache.has(key);
  }

  /**
   * 캐시 덤프 (디버깅용)
   */
  dump(): Array<[string, any, number]> {
    const entries: Array<[string, any, number]> = [];

    for (const [key, value] of this.cache.entries()) {
      const ttl = this.cache.getRemainingTTL(key);
      entries.push([key, value, ttl]);
    }

    return entries;
  }

  /**
   * 캐시 로드 (디버깅용)
   */
  load(entries: Array<[string, any, number]>): void {
    for (const [key, value, ttl] of entries) {
      this.cache.set(key, value, { ttl });
    }
  }
}
