/**
 * 페이지네이션 설정 인터페이스
 *
 * 목록 조회 시 페이지네이션 동작을 제어합니다.
 */
export interface PaginationConfig {
  /**
   * 최대 페이지 크기
   *
   * 클라이언트 요청이 이 값을 초과하면 자동으로 제한됩니다.
   * 예: limit=200 요청 시 → 100으로 제한
   */
  limit?: number;

  /**
   * 기본 페이지 크기
   *
   * 클라이언트가 limit 파라미터를 보내지 않을 때 사용됩니다.
   */
  defaultLimit?: number;

  /**
   * 오프셋 기반 페이지네이션 사용 여부
   *
   * true: ?offset=10&limit=20 (오프셋 기반)
   * false: ?page[number]=2&page[size]=20 (JSON:API 스타일)
   */
  useOffset?: boolean;
}
