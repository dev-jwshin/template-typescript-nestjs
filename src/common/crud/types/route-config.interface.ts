import { FilterOperator } from './filter-operator.type';
import { ParamValidation } from './param-validation.interface';
import { PaginationConfig } from './pagination-config.interface';

/**
 * 개별 라우트 설정 인터페이스
 *
 * 각 CRUD 작업별로 개별 설정을 오버라이드할 수 있습니다.
 * 전역 설정보다 개별 설정이 우선 적용됩니다.
 */
export interface RouteConfig {
  /**
   * 허용된 includes (중첩 관계 지원)
   *
   * 클라이언트가 요청할 수 있는 관계(relation) 목록입니다.
   * 점(.)으로 중첩 관계를 표현합니다.
   * 예: ['profile', 'profile.attachments', 'roles']
   *
   * 요청 예시: ?include=profile,profile.attachments
   */
  allowedIncludes?: string[];

  /**
   * 허용된 필터 (필드명 → 연산자 배열)
   *
   * 각 필드별로 사용 가능한 필터 연산자를 지정합니다.
   *
   * 예시:
   * allowedFilters: {
   *   name: ['eq', 'like', 'ilike'],  // name 필드는 eq, like, ilike 연산자 사용 가능
   *   age: ['gt', 'gte', 'lt', 'lte'] // age 필드는 비교 연산자 사용 가능
   * }
   *
   * 요청 예시: ?filter[name][like]=John&filter[age][gte]=18
   */
  allowedFilters?: Record<string, FilterOperator[]>;

  /**
   * 허용된 정렬 필드
   *
   * 클라이언트가 정렬 기준으로 사용할 수 있는 필드 목록입니다.
   * - prefix로 내림차순을 표현합니다.
   *
   * 예: allowedSorts: ['createdAt', 'name']
   * 요청 예시: ?sort=-createdAt,name (createdAt 내림차순, name 오름차순)
   */
  allowedSorts?: string[];

  /**
   * 라우트별 데코레이터
   *
   * 이 라우트에만 적용할 데코레이터 목록입니다.
   * 예: [UseGuards(AuthGuard), UseGuards(RolesGuard('admin'))]
   */
  decorators?: Array<MethodDecorator | ClassDecorator>;

  /**
   * 라우트별 페이지네이션 설정
   *
   * 전역 페이지네이션 설정을 오버라이드합니다.
   */
  pagination?: PaginationConfig;

  /**
   * 라우트별 허용 파라미터 (Create, Update용)
   *
   * Create, Update 작업에서 허용할 파라미터와 검증 규칙을 지정합니다.
   */
  allowedParams?: Record<string, ParamValidation>;

  /**
   * 라우트 비활성화 여부
   *
   * true인 경우 해당 라우트가 생성되지 않습니다.
   */
  disabled?: boolean;

  /**
   * HTTP 메서드 오버라이드 (선택)
   *
   * 기본 HTTP 메서드 대신 사용할 메서드를 지정합니다.
   * 예: Update를 PATCH 대신 PUT으로 변경
   */
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

  /**
   * 경로 오버라이드 (선택)
   *
   * 기본 경로 대신 사용할 커스텀 경로를 지정합니다.
   * 예: path: ':id/activate' → POST /users/:id/activate
   */
  path?: string;

  /**
   * Swagger 문서 설정
   *
   * API 문서에 표시될 내용을 커스터마이즈합니다.
   */
  swagger?: {
    /** 짧은 요약 */
    summary?: string;

    /** 상세 설명 */
    description?: string;

    /** 태그 (그룹화) */
    tags?: string[];

    /** 사용 중단 여부 */
    deprecated?: boolean;
  };
}
