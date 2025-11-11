import { CacheStore } from '../interfaces/cache-store.interface';

/**
 * 캐시 엔트리
 */
interface CacheEntry {
  data: any;
  expiresAt: number;
}

/**
 * MemoryStore 옵션
 */
interface MemoryStoreOptions {
  /**
   * 자동 정리 간격 (밀리초)
   * @default 300000 (5분)
   */
  cleanupInterval?: number;

  /**
   * 최대 항목 수
   * @default 10000
   */
  maxItems?: number;
}

/**
 * 인메모리 캐시 저장소
 *
 * 개발 환경과 작은 규모의 애플리케이션에 적합합니다.
 * 프로덕션 환경에서는 Redis 사용을 권장합니다.
 *
 * 특징:
 * - 프로세스 메모리 기반 (서버 재시작 시 캐시 손실)
 * - 단일 인스턴스만 지원 (분산 환경 부적합)
 * - 별도 설치 불필요
 * - 빠른 응답 속도
 * - 자동 만료 정리 (기본 5분마다)
 * - 최대 항목 수 제한 (기본 10,000개)
 */
export class MemoryStore implements CacheStore {
  private cache = new Map<string, CacheEntry>();
  private cleanupTimer?: NodeJS.Timeout;
  private readonly options: Required<MemoryStoreOptions>;

  constructor(options: MemoryStoreOptions = {}) {
    this.options = {
      cleanupInterval: options.cleanupInterval ?? 300000, // 기본 5분
      maxItems: options.maxItems ?? 10000, // 기본 10,000개
    };

    this.startCleanupScheduler();
    console.log(
      `[MemoryStore] 초기화 완료 (정리 간격: ${this.options.cleanupInterval}ms, 최대 항목: ${this.options.maxItems}개)`,
    );
  }

  /**
   * 캐시 값 조회
   */
  async get(key: string): Promise<any | null> {
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
   * 캐시 값 저장
   */
  async set(key: string, value: any, ttl: number): Promise<void> {
    // 최대 항목 수 체크 (새 항목 추가 시)
    if (!this.cache.has(key) && this.cache.size >= this.options.maxItems) {
      // 가장 오래된 항목 삭제 (FIFO 방식)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        console.warn(
          `[MemoryStore] 최대 항목 수 도달, 가장 오래된 항목 삭제: ${firstKey}`,
        );
      }
    }

    const expiresAt = Date.now() + ttl * 1000;
    this.cache.set(key, { data: value, expiresAt });
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
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * 전체 캐시 삭제
   */
  async clear(): Promise<void> {
    this.cache.clear();
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
    const entry = this.cache.get(key);
    if (!entry) return false;

    // 만료 확인
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
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
   * 디버깅: 모든 캐시 키 조회
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 자동 정리 스케줄러 시작
   */
  private startCleanupScheduler(): void {
    this.cleanupTimer = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`[MemoryStore] ${cleaned}개 만료 항목 정리 완료`);
      }
    }, this.options.cleanupInterval);

    // Node.js 프로세스가 종료되기 전에 타이머 정리
    this.cleanupTimer.unref();
  }

  /**
   * 자동 정리 스케줄러 중지
   */
  private stopCleanupScheduler(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      console.log('[MemoryStore] 자동 정리 스케줄러 중지');
    }
  }

  /**
   * 연결 종료 (자동 정리 중지)
   */
  async disconnect(): Promise<void> {
    this.stopCleanupScheduler();
    await this.clear();
    console.log('[MemoryStore] 연결 종료 및 캐시 정리 완료');
  }

  /**
   * 메모리 사용량 추정 (bytes)
   */
  getMemoryUsage(): number {
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      // JSON 직렬화 후 크기 계산 (대략적인 메모리 사용량)
      totalSize += JSON.stringify(entry.data).length;
    }

    return totalSize;
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): {
    size: number;
    maxItems: number;
    memoryUsage: number;
    cleanupInterval: number;
  } {
    return {
      size: this.cache.size,
      maxItems: this.options.maxItems,
      memoryUsage: this.getMemoryUsage(),
      cleanupInterval: this.options.cleanupInterval,
    };
  }
}
