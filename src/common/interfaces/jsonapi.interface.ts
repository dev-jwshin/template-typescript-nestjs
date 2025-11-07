/**
 * JSON:API 1.1 스펙 타입 정의
 * @see https://jsonapi.org/format/1.1/
 */

/**
 * JSON:API 문서 구조
 */
export interface JsonApiDocument<T = any> {
  /**
   * 주요 리소스 데이터 (단일 또는 배열)
   */
  data?: ResourceObject<T> | ResourceObject<T>[] | null;

  /**
   * 포함된 관련 리소스 배열 (Compound Documents)
   */
  included?: ResourceObject<any>[];

  /**
   * 에러 정보 (data와 함께 사용 불가)
   */
  errors?: JsonApiError[];

  /**
   * 메타 정보
   */
  meta?: Meta;

  /**
   * 링크 정보
   */
  links?: Links;

  /**
   * JSON:API 버전 정보
   */
  jsonapi?: {
    version: '1.1';
    meta?: Meta;
  };
}

/**
 * 리소스 객체
 */
export interface ResourceObject<T = any> {
  /**
   * 리소스 타입 (필수)
   */
  type: string;

  /**
   * 리소스 ID (필수, 생성 요청 시 선택)
   */
  id?: string;

  /**
   * 리소스 속성
   */
  attributes?: T;

  /**
   * 리소스 관계
   */
  relationships?: Relationships;

  /**
   * 리소스 링크
   */
  links?: ResourceLinks;

  /**
   * 리소스 메타 정보
   */
  meta?: Meta;
}

/**
 * 관계 정의
 */
export interface Relationships {
  [key: string]: Relationship;
}

/**
 * 단일 관계
 */
export interface Relationship {
  /**
   * 관계 링크
   */
  links?: RelationshipLinks;

  /**
   * 관계 데이터 (Resource Identifier 또는 배열)
   */
  data?: ResourceIdentifier | ResourceIdentifier[] | null;

  /**
   * 관계 메타 정보
   */
  meta?: Meta;
}

/**
 * 리소스 식별자 (type + id)
 */
export interface ResourceIdentifier {
  type: string;
  id: string;
  meta?: Meta;
}

/**
 * 링크 객체
 */
export interface Links {
  [key: string]: string | LinkObject | null;
}

/**
 * 링크 상세 객체
 */
export interface LinkObject {
  href: string;
  meta?: Meta;
}

/**
 * 리소스 링크
 */
export interface ResourceLinks extends Links {
  self?: string | LinkObject;
}

/**
 * 관계 링크
 */
export interface RelationshipLinks extends Links {
  self?: string | LinkObject;
  related?: string | LinkObject;
}

/**
 * 페이지네이션 링크
 */
export interface PaginationLinks extends Links {
  self?: string | LinkObject;
  first?: string | LinkObject | null;
  last?: string | LinkObject | null;
  prev?: string | LinkObject | null;
  next?: string | LinkObject | null;
}

/**
 * 메타 정보 (자유 형식)
 */
export interface Meta {
  [key: string]: any;
}

/**
 * 페이지네이션 메타 정보
 */
export interface PaginationMeta extends Meta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * JSON:API 에러 객체
 */
export interface JsonApiError {
  /**
   * 에러 고유 ID
   */
  id?: string;

  /**
   * HTTP 상태 코드
   */
  status?: string;

  /**
   * 애플리케이션별 에러 코드
   */
  code?: string;

  /**
   * 에러 제목 (간단한 설명)
   */
  title?: string;

  /**
   * 에러 상세 설명
   */
  detail?: string;

  /**
   * 에러 발생 위치
   */
  source?: ErrorSource;

  /**
   * 에러 메타 정보
   */
  meta?: Meta;
}

/**
 * 에러 발생 위치 정보
 */
export interface ErrorSource {
  /**
   * JSON Pointer to the value in the request document
   * @example "/data/attributes/email"
   */
  pointer?: string;

  /**
   * 문제가 있는 쿼리 파라미터 이름
   */
  parameter?: string;

  /**
   * 문제가 있는 HTTP 헤더 이름
   */
  header?: string;
}

/**
 * JSON:API 쿼리 파라미터
 */
export interface JsonApiQueryParams {
  /**
   * Sparse Fieldsets
   * @example fields[users]=name,email&fields[posts]=title
   */
  fields?: Record<string, string>;

  /**
   * Include related resources
   * @example include=posts,comments
   */
  include?: string;

  /**
   * Filtering
   * @example filter[status]=active&filter[age][gte]=18
   */
  filter?: Record<string, any>;

  /**
   * Sorting
   * @example sort=-createdAt,name
   */
  sort?: string;

  /**
   * Pagination
   * @example page[number]=1&page[size]=10
   */
  page?: {
    number?: number;
    size?: number;
  };
}
