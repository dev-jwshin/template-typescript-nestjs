/**
 * 공통 API 응답 인터페이스
 * - 일관된 응답 형식 제공
 */
export interface ApiResponse<T = any> {
  /**
   * 응답 성공 여부
   */
  success: boolean;

  /**
   * 응답 메시지
   */
  message?: string;

  /**
   * 응답 데이터
   */
  data?: T;

  /**
   * 에러 정보 (실패 시)
   */
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  /**
   * 타임스탬프
   */
  timestamp: string;
}

/**
 * 페이지네이션 응답 인터페이스
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /**
   * 페이지네이션 메타데이터
   */
  meta: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
