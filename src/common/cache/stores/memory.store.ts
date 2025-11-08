import { CacheStore } from '../interfaces/cache-store.interface';

/**
 * 캐시 엔트리
 */
interface CacheEntry {
  data: any;
  expiresAt: number;
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
 */
export class MemoryStore implements CacheStore {
  private cache = new Map<string, CacheEntry>();

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
    const expiresAt = Date.now() + ttl * 1000;
    this.cache.set(key, { data: value, expiresAt });
  }

  /**
   * 캐시 값 삭제
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * 패턴 매칭 캐시 삭제
   */
  async deletePattern(pattern: string): Promise<void> {
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
   * 디버깅: 만료된 캐시 정리
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
}
