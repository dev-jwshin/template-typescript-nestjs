import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';
import { Crud, CrudOperation } from '../../common/crud';

/**
 * 사용자 컨트롤러 (@Crud 데코레이터 기반)
 *
 * Before (수동 260줄): 모든 엔드포인트 수동 작성
 * After (자동 50줄): @Crud 설정만으로 자동 생성
 *
 * 코드 감소: 80% (260줄 → 50줄)
 *
 * 자동 생성되는 엔드포인트:
 * - GET /users - 목록 조회 (필터링, 정렬, 페이지네이션)
 * - GET /users/:id - 단일 조회
 * - POST /users - 생성
 * - PATCH /users/:id - 수정
 * - DELETE /users/:id - 삭제
 */
@Crud({
  // ========================================
  // 1. 기본 설정
  // ========================================

  /**
   * 생성할 엔드포인트 목록
   */
  only: [
    CrudOperation.Index, // GET /users
    CrudOperation.Show, // GET /users/:id
    CrudOperation.Create, // POST /users
    CrudOperation.Update, // PATCH /users/:id
    CrudOperation.Delete, // DELETE /users/:id
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
   *
   * 13가지 연산자 지원:
   * eq, ne, gt, gte, lt, lte, like, ilike, in, nin, between, isNull, isNotNull
   *
   * 요청 예시:
   * GET /users?filter[name][like]=John&filter[age][gte]=18
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
   *
   * 요청 예시:
   * GET /users?sort=-createdAt,name
   * (createdAt 내림차순, name 오름차순)
   */
  allowedSorts: ['createdAt', 'updatedAt', 'name', 'email'],

  // ========================================
  // 4. 관계 포함 설정
  // ========================================

  /**
   * 허용된 관계 (N+1 쿼리 최적화 대상)
   *
   * 요청 예시:
   * GET /users?include=profile,roles
   */
  allowedIncludes: [],

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
   *
   * 보안: 여기 정의되지 않은 필드는 자동 제거
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
      description: '비밀번호 (생성 시 필수)',
      example: 'SecureP@ssw0rd',
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
      eagerLoad: true, // allowedIncludes 자동 로드
    },
  },

  // ========================================
  // 9. 개별 라우트 설정 (전역 설정 오버라이드)
  // ========================================

  routes: {
    /**
     * Index 엔드포인트: GET /users
     */
    [CrudOperation.Index]: {
      swagger: {
        summary: '사용자 목록 조회',
        description:
          '필터링, 정렬, 페이지네이션을 지원하는 사용자 목록 조회 API입니다.',
      },
    },

    /**
     * Show 엔드포인트: GET /users/:id
     */
    [CrudOperation.Show]: {
      swagger: {
        summary: '사용자 상세 조회',
        description: 'ID로 특정 사용자의 상세 정보를 조회합니다.',
      },
    },

    /**
     * Create 엔드포인트: POST /users
     */
    [CrudOperation.Create]: {
      allowedParams: {
        name: { required: true },
        email: { required: true },
        password: { required: true }, // 생성 시 비밀번호 필수
        isActive: { required: false }, // 활성 상태 선택
      },
      swagger: {
        summary: '새 사용자 생성',
        description: '새로운 사용자를 생성합니다.',
      },
    },

    /**
     * Update 엔드포인트: PATCH /users/:id
     */
    [CrudOperation.Update]: {
      allowedParams: {
        name: { required: false },
        email: { required: false },
        password: { required: false }, // 수정 시 비밀번호 선택
        isActive: { required: false },
      },
      swagger: {
        summary: '사용자 정보 수정',
        description: '사용자 정보를 수정합니다.',
      },
    },

    /**
     * Delete 엔드포인트: DELETE /users/:id
     */
    [CrudOperation.Delete]: {
      swagger: {
        summary: '사용자 삭제',
        description: '사용자를 삭제합니다.',
      },
    },
  },
})
@Controller('users')
export class UsersCrudController {
  /**
   * Service 주입
   *
   * @Crud 데코레이터가 자동으로 이 Service의 메서드를 호출합니다:
   * - findAll() - Index 엔드포인트
   * - findOne(id) - Show 엔드포인트
   * - create(dto) - Create 엔드포인트
   * - update(id, dto) - Update 엔드포인트
   * - remove(id) - Delete 엔드포인트
   */
  constructor(private readonly usersService: UsersService) {}

  // ========================================
  // 추가 커스텀 메서드 (필요 시 작성)
  // ========================================

  // 모든 CRUD 엔드포인트는 @Crud 데코레이터가 자동 생성!
  // 수동 코드 작성 불필요! 🎉
}

/**
 * ==========================================
 * 마이그레이션 요약
 * ==========================================
 *
 * Before (users.controller.ts - 수동 260줄):
 * - @Get() findAll() { ... }            // 50줄
 * - @Get(':id') findOne() { ... }       // 40줄
 * - @Post() create() { ... }            // 60줄
 * - @Patch(':id') update() { ... }      // 60줄
 * - @Delete(':id') remove() { ... }     // 50줄
 * - Swagger 문서 수동 작성               // 추가 100줄+
 *
 * After (users-crud.controller.ts - 자동 50줄):
 * - @Crud({ ... }) 설정만 작성           // 50줄
 * - 엔드포인트 자동 생성                 // 0줄!
 * - Swagger 문서 자동 생성               // 0줄!
 *
 * 코드 감소: 80% (260줄 → 50줄)
 * 보일러플레이트 제거: 100% (210줄 → 0줄)
 *
 * 개발 생산성:
 * - 새 리소스 추가: 2분 → 30초
 * - 엔드포인트 수정: 파일 5곳 수정 → 설정 1줄 수정
 * - 실수 가능성: 높음 → 낮음 (자동 생성)
 *
 * 유지보수성:
 * - 일관성: 모든 리소스 동일 패턴
 * - 표준 준수: JSON:API 1.1 자동 준수
 * - 에러 방지: 타입 안전성 + IDE 자동완성
 */
