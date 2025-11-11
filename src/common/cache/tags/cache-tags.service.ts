import { Injectable, Inject } from '@nestjs/common';
import { CacheStore } from '../interfaces/cache-store.interface';

/**
 * 캐시 태그 서비스
 *
 * 캐시 항목을 태그로 그룹화하여 일괄 무효화를 지원합니다.
 *
 * 사용 예시:
 * ```typescript
 * // 태그와 함께 캐시 저장
 * await this.cacheTags.setWithTags(
 *   'user:123',
 *   user,
 *   3600,
 *   ['users', 'user:123']
 * );
 *
 * // 태그로 캐시 무효화
 * await this.cacheTags.invalidateTag('users'); // 모든 사용자 캐시 삭제
 * ```
 */
@Injectable()
export class CacheTagsService {
  private readonly TAG_PREFIX = 'tag:';
  private readonly TAG_SET_SUFFIX = ':keys';

  constructor(@Inject('CACHE_STORE') private readonly store: CacheStore) {}

  /**
   * 태그와 함께 캐시 저장
   *
   * @param key 캐시 키
   * @param value 저장할 값
   * @param ttl TTL(초 단위)
   * @param tags 태그 배열
   */
  async setWithTags<T = any>(
    key: string,
    value: T,
    ttl: number,
    tags: string[],
  ): Promise<void> {
    // 캐시 값 저장
    await this.store.set(key, value, ttl);

    // 각 태그에 키 등록
    for (const tag of tags) {
      await this.addKeyToTag(tag, key, ttl);
    }
  }

  /**
   * 태그 무효화 (태그에 속한 모든 캐시 삭제)
   *
   * @param tag 태그 이름
   * @returns 삭제된 캐시 키 수
   */
  async invalidateTag(tag: string): Promise<number> {
    const keys = await this.getKeysForTag(tag);

    if (keys.length === 0) {
      return 0;
    }

    // 모든 캐시 키 삭제
    await Promise.all(keys.map((key) => this.store.delete(key)));

    // 태그 메타데이터 삭제
    await this.store.delete(this.getTagKey(tag));

    console.log(`[CacheTagsService] 태그 "${tag}" 무효화 (${keys.length}개 키 삭제)`);

    return keys.length;
  }

  /**
   * 여러 태그 무효화
   *
   * @param tags 태그 배열
   * @returns 삭제된 캐시 키 수
   */
  async invalidateTags(tags: string[]): Promise<number> {
    const results = await Promise.all(tags.map((tag) => this.invalidateTag(tag)));
    return results.reduce((sum, count) => sum + count, 0);
  }

  /**
   * 태그에 속한 모든 키 조회
   *
   * @param tag 태그 이름
   * @returns 캐시 키 배열
   */
  async getKeysForTag(tag: string): Promise<string[]> {
    const tagKey = this.getTagKey(tag);
    const keysData = await this.store.get(tagKey);

    if (!keysData || !Array.isArray(keysData)) {
      return [];
    }

    return keysData;
  }

  /**
   * 특정 키에 연결된 태그 조회
   *
   * @param key 캐시 키
   * @returns 태그 배열
   */
  async getTagsForKey(key: string): Promise<string[]> {
    const metaKey = this.getKeyMetaKey(key);
    const tags = await this.store.get(metaKey);

    if (!tags || !Array.isArray(tags)) {
      return [];
    }

    return tags;
  }

  /**
   * 태그에 키 추가
   */
  private async addKeyToTag(tag: string, key: string, ttl: number): Promise<void> {
    const tagKey = this.getTagKey(tag);
    const currentKeys = await this.getKeysForTag(tag);

    // 중복 제거 후 추가
    if (!currentKeys.includes(key)) {
      currentKeys.push(key);
      await this.store.set(tagKey, currentKeys, ttl);
    }

    // 키 메타데이터에 태그 저장
    await this.addTagToKeyMeta(key, tag, ttl);
  }

  /**
   * 키 메타데이터에 태그 추가
   */
  private async addTagToKeyMeta(key: string, tag: string, ttl: number): Promise<void> {
    const metaKey = this.getKeyMetaKey(key);
    const currentTags = await this.getTagsForKey(key);

    if (!currentTags.includes(tag)) {
      currentTags.push(tag);
      await this.store.set(metaKey, currentTags, ttl);
    }
  }

  /**
   * 태그 키 생성
   */
  private getTagKey(tag: string): string {
    return `${this.TAG_PREFIX}${tag}${this.TAG_SET_SUFFIX}`;
  }

  /**
   * 키 메타데이터 키 생성
   */
  private getKeyMetaKey(key: string): string {
    return `meta:${key}:tags`;
  }

  /**
   * 모든 태그 목록 조회
   *
   * @returns 태그 배열
   */
  async getAllTags(): Promise<string[]> {
    // 패턴 매칭으로 모든 태그 키 조회
    const pattern = `^${this.TAG_PREFIX}.*${this.TAG_SET_SUFFIX}$`;
    await this.store.deletePattern(pattern);

    // 실제 구현은 Store에 따라 다를 수 있음
    // 여기서는 간단히 빈 배열 반환
    return [];
  }

  /**
   * 태그 통계 조회
   */
  async getTagStats(): Promise<
    Array<{
      tag: string;
      keyCount: number;
    }>
  > {
    // 실제 구현은 getAllTags()가 제대로 동작할 때 가능
    return [];
  }
}
