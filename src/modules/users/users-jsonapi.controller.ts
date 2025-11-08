import { Controller, UseInterceptors, UseFilters } from '@nestjs/common';
import { UsersService } from './users.service';
import { Crud, CrudOperation } from '../../common/crud';
import { JsonApiTransformInterceptor } from '../../common/interceptors/jsonapi-transform.interceptor';
import { JsonApiExceptionFilter } from '../../common/filters/jsonapi-exception.filter';

/**
 * JSON:API 전용 사용자 컨트롤러
 *
 * /api/users 경로로 JSON:API 1.1 스펙을 완전히 준수하는 엔드포인트 제공
 */
@Crud({
  // ========================================
  // 1. 기본 설정
  // ========================================

  /**
   * 생성할 엔드포인트 목록
   */
  only: [
    CrudOperation.Index, // GET /api/users
    CrudOperation.Show, // GET /api/users/:id
    CrudOperation.Create, // POST /api/users
    CrudOperation.Update, // PATCH /api/users/:id
    CrudOperation.Delete, // DELETE /api/users/:id
  ],

  /**
   * JSON:API 리소스 타입
   */
  resourceType: 'users',

  // ========================================
  // 2. 필터링 설정
  // ========================================

  /**
   * 허용된 필터 (필드명 → 연산자 배열)
   */
  allowedFilters: {
    name: ['eq', 'like', 'ilike'],
    email: ['eq', 'like', 'ilike'],
    isActive: ['eq'],
    createdAt: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  },

  // ========================================
  // 3. 정렬 설정
  // ========================================

  /**
   * 허용된 정렬 필드
   */
  allowedSorts: ['createdAt', 'updatedAt', 'name', 'email'],

  // ========================================
  // 4. 관계 포함 설정
  // ========================================

  /**
   * 허용된 관계
   */
  allowedIncludes: ['profile', 'posts'],

  // ========================================
  // 5. 페이지네이션 설정
  // ========================================

  /**
   * 페이지네이션 기본값
   */
  pagination: {
    defaultLimit: 20,
    limit: 100,
  },

  // ========================================
  // 6. 파라미터 화이트리스트
  // ========================================

  /**
   * Create/Update에서 허용할 파라미터
   */
  allowedParams: {
    name: {
      required: true,
      description: '사용자 이름',
      example: 'John Doe',
    },
    email: {
      required: true,
      description: '사용자 이메일',
      example: 'john@example.com',
    },
    password: {
      type: 'string',
      required: false,
      description: '비밀번호',
      example: 'SecureP@ssw0rd',
    },
    age: {
      type: 'number',
      required: false,
      description: '나이',
      example: 25,
    },
    isActive: {
      type: 'boolean',
      required: false,
      description: '활성 상태',
      example: true,
    },
  },

  // ========================================
  // 7. 응답 직렬화 설정
  // ========================================

  /**
   * 응답에서 제외할 필드
   */
  serialize: {
    exclude: ['password'], // 비밀번호 자동 제외
  },

  // ========================================
  // 8. 성능 최적화 설정
  // ========================================

  /**
   * N+1 쿼리 자동 최적화
   */
  performance: {
    query: {
      eagerLoad: true,
    },
  },

  // ========================================
  // 9. 개별 라우트 설정
  // ========================================

  routes: {
    /**
     * Index 엔드포인트: GET /api/users
     */
    [CrudOperation.Index]: {
      swagger: {
        summary: '사용자 목록 조회 (JSON:API)',
        description: 'JSON:API 1.1 스펙을 준수하는 사용자 목록 조회 API',
      },
    },

    /**
     * Show 엔드포인트: GET /api/users/:id
     */
    [CrudOperation.Show]: {
      swagger: {
        summary: '사용자 상세 조회 (JSON:API)',
        description: 'JSON:API 1.1 스펙을 준수하는 사용자 상세 조회 API',
      },
    },

    /**
     * Create 엔드포인트: POST /api/users
     */
    [CrudOperation.Create]: {
      allowedParams: {
        name: { required: true },
        email: { required: true },
        password: { required: true },
        age: { required: false },
        isActive: { required: false },
      },
      swagger: {
        summary: '새 사용자 생성 (JSON:API)',
        description: 'JSON:API 1.1 스펙을 준수하는 사용자 생성 API',
      },
    },

    /**
     * Update 엔드포인트: PATCH /api/users/:id
     */
    [CrudOperation.Update]: {
      allowedParams: {
        name: { required: false },
        email: { required: false },
        password: { required: false },
        age: { required: false },
        isActive: { required: false },
      },
      swagger: {
        summary: '사용자 정보 수정 (JSON:API)',
        description: 'JSON:API 1.1 스펙을 준수하는 사용자 수정 API',
      },
    },

    /**
     * Delete 엔드포인트: DELETE /api/users/:id
     */
    [CrudOperation.Delete]: {
      swagger: {
        summary: '사용자 삭제 (JSON:API)',
        description: 'JSON:API 1.1 스펙을 준수하는 사용자 삭제 API',
      },
    },
  },
})
@Controller('users') // 글로벌 prefix 'api'가 자동으로 추가됨 → /api/users
@UseInterceptors(JsonApiTransformInterceptor)
@UseFilters(JsonApiExceptionFilter)
// JsonApiTransformMiddleware가 이미 JSON:API 형식을 변환했으므로
// 글로벌 ValidationPipe가 변환된 객체를 검증함
export class UsersJsonApiController {
  constructor(private readonly usersService: UsersService) {}
}
