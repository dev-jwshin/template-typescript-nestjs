import { Type } from '@nestjs/common';
import { CrudOperation } from './crud-operation.enum';
import { FilterOperator } from './filter-operator.type';
import { ParamValidation } from './param-validation.interface';
import { PaginationConfig } from './pagination-config.interface';
import { PerformanceConfig } from './performance-config.interface';
import { RouteConfig } from './route-config.interface';
import { CrudPlugin } from '../plugins/crud-plugin.interface';

/**
 * 메인 CRUD 데코레이터 설정 인터페이스
 *
 * @Crud 데코레이터의 설정 객체 타입입니다.
 * 모든 CRUD 동작을 제어하는 중앙 설정입니다.
 */
export interface CrudConfig {
  /**
   * 생성할 엔드포인트 (필수)
   *
   * 자동으로 생성할 CRUD 작업 목록입니다.
   *
   * 예시:
   * only: [CrudOperation.Index, CrudOperation.Show]
   * → GET /users (목록), GET /users/:id (단일) 엔드포인트만 생성
   */
  only: CrudOperation[];

  /**
   * 전역 허용 파라미터
   *
   * Create, Update 작업에서 기본적으로 허용할 파라미터입니다.
   * 개별 라우트 설정에서 오버라이드 가능합니다.
   *
   * 화이트리스트 방식:
   * - 여기에 정의되지 않은 파라미터는 조용히 무시됩니다.
   * - 보안: 의도하지 않은 필드 변경을 방지합니다.
   */
  allowedParams?: Record<string, ParamValidation>;

  /**
   * 전역 허용 includes
   *
   * 모든 조회 작업에서 기본적으로 허용할 관계(relation) 목록입니다.
   * 점(.)으로 중첩 관계를 표현합니다.
   *
   * 예: ['profile', 'profile.attachments', 'roles']
   */
  allowedIncludes?: string[];

  /**
   * 전역 허용 필터
   *
   * 모든 조회 작업에서 기본적으로 허용할 필터 설정입니다.
   * 필드명을 키로, 사용 가능한 연산자 배열을 값으로 가집니다.
   */
  allowedFilters?: Record<string, FilterOperator[]>;

  /**
   * 전역 허용 정렬
   *
   * 모든 조회 작업에서 기본적으로 허용할 정렬 필드 목록입니다.
   */
  allowedSorts?: string[];

  /**
   * 전역 데코레이터
   *
   * 모든 엔드포인트에 공통으로 적용할 데코레이터 목록입니다.
   * 예: [UseGuards(AuthGuard)] → 모든 엔드포인트에 인증 필요
   */
  decorators?: Array<MethodDecorator | ClassDecorator>;

  /**
   * 전역 페이지네이션 설정
   *
   * 모든 목록 조회 작업에 적용할 페이지네이션 설정입니다.
   */
  pagination?: PaginationConfig;

  /**
   * 개별 라우트 설정 (전역 설정 오버라이드)
   *
   * 각 CRUD 작업별로 전역 설정을 오버라이드할 수 있습니다.
   *
   * 키:
   * - CrudOperation enum 값 (index, show, create, update, delete)
   * - 커스텀 함수 이름 (문자열)
   *
   * 값: RouteConfig 객체
   */
  routes?: Partial<Record<CrudOperation | string, RouteConfig>>;

  /**
   * 모델 클래스 (타입 추론용)
   *
   * 엔티티 클래스를 지정하면 타입 안정성이 향상됩니다.
   */
  model?: Type<any>;

  /**
   * DTO 클래스들 (선택)
   *
   * Create, Update 작업에서 사용할 DTO 클래스를 지정합니다.
   */
  dto?: {
    create?: Type<any>;
    update?: Type<any>;
  };

  /**
   * JSON:API 리소스 타입
   *
   * JSON:API 응답의 type 필드에 사용될 값입니다.
   * 예: 'users', 'posts', 'comments'
   */
  resourceType?: string;

  /**
   * Soft Delete 사용 여부
   *
   * true인 경우:
   * - Delete 작업 시 실제 삭제 대신 deletedAt 필드를 설정합니다.
   * - 조회 작업 시 deletedAt이 NULL인 항목만 반환합니다.
   */
  softDelete?: boolean;

  /**
   * 성능 최적화 설정 (선택)
   *
   * 쿼리 최적화, 캐싱, 스트리밍 등을 설정합니다.
   */
  performance?: PerformanceConfig;

  /**
   * 플러그인 목록 (선택)
   *
   * CRUD 동작을 확장할 플러그인 목록입니다.
   */
  plugins?: CrudPlugin[];
}
