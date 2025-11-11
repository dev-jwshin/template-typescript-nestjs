import { Injectable, Inject } from '@nestjs/common';
import { CacheStore } from '../interfaces/cache-store.interface';
import { randomUUID } from 'crypto';

/**
 * 분산 락 서비스
 *
 * Redis 기반 분산 락 메커니즘을 제공합니다.
 * 동시성 제어가 필요한 작업에 사용합니다.
 *
 * 사용 예시:
 * ```typescript
 * // 락 획득 및 해제
 * const lockId = await this.lockService.acquire('order:123', 30);
 * try {
 *   // 임계 구역 (critical section)
 *   await this.processOrder(orderId);
 * } finally {
 *   await this.lockService.release('order:123', lockId);
 * }
 *
 * // 또는 withLock 헬퍼 사용
 * await this.lockService.withLock('order:123', async () => {
 *   await this.processOrder(orderId);
 * }, 30);
 * ```
 */
@Injectable()
export class DistributedLockService {
  private readonly LOCK_PREFIX = 'lock:';
  private readonly DEFAULT_TTL = 10; // 기본 10초
  private readonly DEFAULT_RETRIES = 3;
  private readonly RETRY_DELAY = 100; // 100ms

  constructor(@Inject('CACHE_STORE') private readonly store: CacheStore) {}

  /**
   * 락 획득
   *
   * @param key 락 키
   * @param ttl 락 TTL(초 단위)
   * @param retries 재시도 횟수
   * @returns 락 ID (해제 시 필요) 또는 null (획득 실패)
   */
  async acquire(
    key: string,
    ttl: number = this.DEFAULT_TTL,
    retries: number = this.DEFAULT_RETRIES,
  ): Promise<string | null> {
    const lockKey = this.getLockKey(key);
    const lockId = randomUUID();

    for (let attempt = 0; attempt < retries; attempt++) {
      // 락이 존재하지 않으면 획득
      const existing = await this.store.get(lockKey);

      if (!existing) {
        await this.store.set(lockKey, lockId, ttl);
        console.log(`[DistributedLock] 락 획득: ${key} (ID: ${lockId})`);
        return lockId;
      }

      // 대기 후 재시도
      if (attempt < retries - 1) {
        await this.sleep(this.RETRY_DELAY);
      }
    }

    console.warn(`[DistributedLock] 락 획득 실패: ${key} (${retries}회 재시도)`);
    return null;
  }

  /**
   * 락 해제
   *
   * @param key 락 키
   * @param lockId 락 ID (acquire에서 반환된 값)
   * @returns 해제 성공 여부
   */
  async release(key: string, lockId: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    const currentLockId = await this.store.get(lockKey);

    // 락 소유자만 해제 가능
    if (currentLockId !== lockId) {
      console.warn(`[DistributedLock] 락 해제 실패: ${key} (소유자 불일치)`);
      return false;
    }

    await this.store.delete(lockKey);
    console.log(`[DistributedLock] 락 해제: ${key} (ID: ${lockId})`);
    return true;
  }

  /**
   * 락 보호 실행
   *
   * 락을 획득한 후 콜백을 실행하고 자동으로 락을 해제합니다.
   *
   * @param key 락 키
   * @param callback 실행할 함수
   * @param ttl 락 TTL(초 단위)
   * @param retries 재시도 횟수
   * @returns 콜백 결과
   * @throws Error 락 획득 실패 시
   */
  async withLock<T>(
    key: string,
    callback: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
    retries: number = this.DEFAULT_RETRIES,
  ): Promise<T> {
    const lockId = await this.acquire(key, ttl, retries);

    if (!lockId) {
      throw new Error(`락 획득 실패: ${key}`);
    }

    try {
      return await callback();
    } finally {
      await this.release(key, lockId);
    }
  }

  /**
   * 락이 존재하는지 확인
   *
   * @param key 락 키
   * @returns 락 존재 여부
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    const lockId = await this.store.get(lockKey);
    return lockId !== null;
  }

  /**
   * 락 TTL 연장
   *
   * @param key 락 키
   * @param lockId 락 ID
   * @param ttl 새로운 TTL(초 단위)
   * @returns 연장 성공 여부
   */
  async extend(key: string, lockId: string, ttl: number): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    const currentLockId = await this.store.get(lockKey);

    // 락 소유자만 연장 가능
    if (currentLockId !== lockId) {
      console.warn(`[DistributedLock] 락 연장 실패: ${key} (소유자 불일치)`);
      return false;
    }

    await this.store.set(lockKey, lockId, ttl);
    console.log(`[DistributedLock] 락 연장: ${key} (TTL: ${ttl}초)`);
    return true;
  }

  /**
   * 강제 락 해제
   *
   * ⚠️ 주의: 소유자 확인 없이 락을 강제로 해제합니다.
   * 디버깅 또는 비상 상황에서만 사용하세요.
   *
   * @param key 락 키
   */
  async forceRelease(key: string): Promise<void> {
    const lockKey = this.getLockKey(key);
    await this.store.delete(lockKey);
    console.warn(`[DistributedLock] 강제 락 해제: ${key}`);
  }

  /**
   * 락 키 생성
   */
  private getLockKey(key: string): string {
    return `${this.LOCK_PREFIX}${key}`;
  }

  /**
   * 대기 헬퍼
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 락 정보 조회
   */
  async getLockInfo(key: string): Promise<{
    locked: boolean;
    lockId?: string;
  }> {
    const lockKey = this.getLockKey(key);
    const lockId = await this.store.get(lockKey);

    return {
      locked: lockId !== null,
      lockId: lockId || undefined,
    };
  }
}
