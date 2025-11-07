import { FilterOperator } from './filter-operator.type';

/**
 * CRUD 요청 컨텍스트 인터페이스
 *
 * 훅 함수에서 사용하는 요청 정보입니다.
 */
export interface CrudRequest {
  /**
   * Express Request 객체
   */
  req: any;

  /**
   * 파싱된 쿼리 파라미터
   */
  parsed: {
    /**
     * 파라미터 필터 (예: :id)
     */
    paramsFilter: Array<{ field: string; operator: string; value: any }>;

    /**
     * 검색 조건
     */
    search?: Record<string, any>;

    /**
     * 필터 조건
     */
    filter?: Array<{ field: string; operator: FilterOperator; value: any }>;

    /**
     * 정렬 조건
     */
    sort?: Array<{ field: string; order: 'ASC' | 'DESC' }>;

    /**
     * 포함할 관계
     */
    join?: Array<{ field: string; select: string[] }>;

    /**
     * 페이지네이션
     */
    page?: { limit: number; offset: number };
  };

  /**
   * 인증된 사용자 정보
   */
  user?: any;

  /**
   * IP 주소
   */
  ip?: string;

  /**
   * HTTP 헤더
   */
  headers?: Record<string, string>;
}
