import { CrudOperation } from './crud-operation.enum';
import { CrudRequest } from './crud-request.interface';

/**
 * 성능 최적화 설정 인터페이스
 *
 * 대용량 데이터 처리, N+1 쿼리 문제 해결, 캐싱 등을 지원합니다.
 */
export interface PerformanceConfig {
  /**
   * 쿼리 최적화 설정
   */
  query?: {
    /**
     * Eager Loading 자동화
     *
     * allowedIncludes 기반으로 관계를 자동으로 로드합니다.
     * N+1 쿼리 문제를 방지합니다.
     */
    eagerLoad?: boolean;

    /**
     * 데이터베이스 인덱스 힌트
     *
     * 쿼리 실행 시 사용할 인덱스를 명시적으로 지정합니다.
     */
    indexHints?: string[];

    /**
     * 쿼리 타임아웃 (밀리초)
     *
     * 지정된 시간 내에 쿼리가 완료되지 않으면 타임아웃 에러를 발생시킵니다.
     */
    timeout?: number;
  };

  /**
   * 캐싱 설정
   */
  cache?: {
    /**
     * 캐시 사용 여부
     */
    enabled: boolean;

    /**
     * TTL (Time To Live) - 초 단위
     *
     * 캐시 항목이 유효한 시간입니다.
     */
    ttl?: number;

    /**
     * 캐시 키 생성 전략
     *
     * - simple: 단순 키 (예: users:1)
     * - query-based: 쿼리 파라미터 기반 (예: users?filter[name]=John&sort=-createdAt)
     * - custom: 커스텀 함수 사용
     */
    keyStrategy?: 'simple' | 'query-based' | 'custom';

    /**
     * 커스텀 캐시 키 생성 함수
     *
     * keyStrategy가 'custom'일 때 사용됩니다.
     */
    keyGenerator?: (req: CrudRequest) => string;

    /**
     * 캐시 무효화 전략
     *
     * 지정된 작업이 실행되면 관련 캐시를 무효화합니다.
     * 예: Create, Update, Delete 시 목록 캐시 무효화
     */
    invalidateOn?: CrudOperation[];
  };

  /**
   * 스트리밍 설정
   */
  streaming?: {
    /**
     * 대용량 데이터 스트리밍 사용 여부
     *
     * true인 경우 데이터를 청크 단위로 나누어 전송합니다.
     * 메모리 사용량을 줄이고 초기 응답 시간을 개선합니다.
     */
    enabled: boolean;

    /**
     * 청크 크기
     *
     * 한 번에 전송할 데이터 항목 수입니다.
     */
    chunkSize?: number;
  };
}
