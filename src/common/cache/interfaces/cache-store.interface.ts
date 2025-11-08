/**
 * 캐시 저장소 인터페이스
 *
 * Memory와 Redis 캐시 저장소의 통일된 인터페이스를 제공합니다.
 * 전략 패턴(Strategy Pattern)을 적용하여 캐시 구현체를 교체할 수 있습니다.
 */
export interface CacheStore {
  /**
   * 캐시 값 조회
   *
   * @param key - 캐시 키
   * @returns 캐시된 값 또는 null (만료/미존재)
   */
  get(key: string): Promise<any | null>;

  /**
   * 캐시 값 저장
   *
   * @param key - 캐시 키
   * @param value - 저장할 값 (객체는 자동으로 직렬화됨)
   * @param ttl - TTL(Time To Live) in seconds
   */
  set(key: string, value: any, ttl: number): Promise<void>;

  /**
   * 캐시 값 삭제
   *
   * @param key - 캐시 키
   */
  delete(key: string): Promise<void>;

  /**
   * 패턴 매칭 캐시 삭제
   *
   * @param pattern - 정규식 패턴 (예: '^users:')
   */
  deletePattern(pattern: string): Promise<void>;

  /**
   * 전체 캐시 삭제
   */
  clear(): Promise<void>;

  /**
   * 캐시 항목 개수
   *
   * @returns 저장된 캐시 항목 수
   */
  size(): Promise<number>;

  /**
   * 연결 상태 확인
   *
   * @returns 연결 성공 여부
   */
  isConnected(): Promise<boolean>;
}
