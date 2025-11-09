import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../../common/crud';
import { ProductsService } from '../products.service';
import { IsString } from 'class-validator';

/**
 * AdminProductsController (관리자 전용 API)
 *
 * @description
 * 관리자가 접근하는 Product API 컨트롤러입니다.
 * @Crud 데코레이터를 사용하여 모든 CRUD 엔드포인트를 생성합니다.
 *
 * 생성되는 엔드포인트:
 * - GET    /admin/products         - 목록 조회 (Index) - 비활성 상품 포함
 * - GET    /admin/products/:id     - 단일 조회 (Show)
 * - POST   /admin/products         - 생성 (Create)
 * - PATCH  /admin/products/:id     - 수정 (Update)
 * - DELETE /admin/products/:id     - 삭제 (Delete)
 *
 * 권한:
 * - 모든 CRUD 작업 가능
 * - 비활성(isActive=false) 상품도 조회 가능
 * - Soft Delete 상품(deletedAt) 조회 가능
 *
 * @remarks
 * 실제 프로젝트에서는 @UseGuards(AdminGuard)를 사용하여
 * 관리자 권한을 검증해야 합니다.
 *
 * @example
 * ```typescript
 * // 관리자 권한 검증 추가
 * import { UseGuards } from '@nestjs/common';
 * import { AdminGuard } from '../../../common/guards/admin.guard';
 *
 * \@Crud({ ... })
 * \@Controller('admin/products')
 * \@UseGuards(AdminGuard)  // ← 관리자 권한 검증
 * export class AdminProductsController { ... }
 * ```
 *
 * @see ProductsController - 일반 사용자 API
 * @see ProductsService - 비즈니스 로직
 */
@Crud({
  /**
   * 생성할 엔드포인트
   *
   * @description
   * 관리자는 모든 CRUD 작업이 가능합니다.
   *
   * - Index: 목록 조회 (필터링, 정렬, 페이지네이션)
   * - Show: 단일 조회
   * - Create: 생성
   * - Update: 수정
   * - Delete: 삭제 (Soft Delete 지원)
   */
  only: [
    CrudOperation.Index, // 목록 조회
    CrudOperation.Show, // 단일 조회
    CrudOperation.Create, // 생성
    CrudOperation.Update, // 수정
    CrudOperation.Delete, // 삭제
  ],

  /**
   * JSON:API 리소스 타입
   *
   * @description
   * 일반 사용자 API와 동일한 'products' 타입 사용
   */
  resourceType: 'products',

  /**
   * 허용된 필터 (관리자용 - 확장)
   *
   * @description
   * 관리자는 모든 필터를 사용할 수 있습니다.
   * 서비스의 allowedFilters와 동일하게 설정합니다.
   *
   * @example
   * ```
   * // API 호출 예시
   * GET /admin/products?filter[isActive][eq]=false  // 비활성 상품만
   * GET /admin/products?filter[stock][lte]=5        // 재고 부족 상품
   * GET /admin/products?filter[deletedAt][isNotNull]=true  // 삭제된 상품
   * ```
   */
  allowedFilters: {
    name: ['eq', 'like', 'ilike'], // 상품명
    slug: ['eq'], // 슬러그
    category: ['eq', 'in'], // 카테고리
    price: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'], // 가격
    stock: ['eq', 'gt', 'gte', 'lt', 'lte'], // 재고
    isActive: ['eq'], // 활성 상태 (true/false 모두 조회 가능)
    createdAt: ['gt', 'gte', 'lt', 'lte', 'between'], // 생성일
  },

  /**
   * 허용된 정렬 필드 (관리자용 - 확장)
   *
   * @description
   * 관리자는 모든 정렬 필드를 사용할 수 있습니다.
   *
   * @example
   * ```
   * GET /admin/products?sort=-stock          // 재고 많은순
   * GET /admin/products?sort=updatedAt       // 수정일 오래된순
   * ```
   */
  allowedSorts: ['createdAt', 'updatedAt', 'name', 'price', 'stock'],

  /**
   * 허용된 관계 포함
   *
   * @description
   * 현재 Product 모델에는 관계가 없으므로 빈 배열입니다.
   *
   * @example
   * ```
   * // 향후 Category 관계 추가 시
   * allowedIncludes: ['category', 'reviews', 'orderItems']
   * ```
   */
  allowedIncludes: [],

  /**
   * 페이지네이션 설정
   *
   * @description
   * 관리자는 더 많은 데이터를 한 번에 조회할 수 있습니다.
   */
  pagination: {
    defaultLimit: 50, // 기본: 50개씩 (일반 사용자: 20개)
    limit: 500, // 최대: 500개까지 (일반 사용자: 100개)
  },

  /**
   * Create/Update 허용 파라미터
   *
   * @description
   * 생성 및 수정 시 허용할 필드를 명시합니다.
   * 여기서 정의하지 않은 필드는 무시됩니다 (화이트리스트 방식).
   *
   * @remarks
   * - required: true → Create 시 필수
   * - required: false → Create 시 선택, Update 시 선택
   * - DTO의 validation과 별개로 추가 보안 계층 제공
   *
   * @example
   * ```json
   * // POST /admin/products
   * {
   *   "data": {
   *     "type": "products",
   *     "attributes": {
   *       "name": "노트북",
   *       "slug": "laptop-2024",
   *       "price": 1500000,
   *       "stock": 10,
   *       "category": "electronics"
   *     }
   *   }
   * }
   * ```
   */
  allowedParams: {
    name: {
      type: 'string',
      required: true,
      validate: [IsString({ message: 'name은 문자열이어야 합니다.' })],
    },
  },

  /**
   * 성능 최적화 설정
   */
  performance: {
    query: {
      eagerLoad: true, // N+1 쿼리 방지
    },
  },

  /**
   * 개별 라우트 설정 (선택)
   *
   * @description
   * 특정 작업에 대해 전역 설정을 오버라이드할 수 있습니다.
   *
   * @example
   * ```typescript
   * routes: {
   *   [CrudOperation.Create]: {
   *     decorators: [
   *       UseGuards(AdminGuard),
   *       UseInterceptors(AuditLogInterceptor),
   *     ],
   *     swagger: {
   *       summary: '새 상품 생성 (관리자 전용)',
   *       description: '관리자만 새 상품을 생성할 수 있습니다.',
   *     },
   *   },
   *   [CrudOperation.Delete]: {
   *     swagger: {
   *       summary: '상품 삭제 (Soft Delete)',
   *       description: '실제 삭제 대신 deletedAt 필드를 설정합니다.',
   *     },
   *   },
   * }
   * ```
   */
})
@Controller('admin/products')
export class AdminProductsController {
  /**
   * 생성자
   *
   * @param productsService - Product 비즈니스 로직 서비스
   *
   * @description
   * NestJS의 의존성 주입을 통해 ProductsService를 주입받습니다.
   * 일반 사용자 컨트롤러와 동일한 서비스를 공유합니다.
   */
  constructor(private readonly productsService: ProductsService) {}

  /**
   * @Crud 데코레이터가 자동으로 생성하는 메서드:
   *
   * 1. index() - GET /admin/products
   *    - 목록 조회 (모든 상품, 비활성 포함)
   *    - ProductsService.findAll() 호출
   *
   * 2. show(id) - GET /admin/products/:id
   *    - 단일 조회
   *    - ProductsService.findOne(id) 호출
   *
   * 3. create(body) - POST /admin/products
   *    - 생성
   *    - ProductsService.create(body) 호출
   *
   * 4. update(id, body) - PATCH /admin/products/:id
   *    - 수정
   *    - ProductsService.update(id, body) 호출
   *
   * 5. delete(id) - DELETE /admin/products/:id
   *    - 삭제 (Soft Delete)
   *    - ProductsService.remove(id) 호출
   *
   * 추가 메서드가 필요한 경우 아래에 직접 정의:
   *
   * @example
   * ```typescript
   * // 재고 일괄 업데이트
   * \@Patch('bulk-update-stock')
   * async bulkUpdateStock(\@Body() updates: BulkStockUpdateDto[]) {
   *   return Promise.all(
   *     updates.map(({ id, stock }) =>
   *       this.productsService.update(id, { stock }),
   *     ),
   *   );
   * }
   *
   * // 재고 부족 상품 조회
   * \@Get('low-stock')
   * async findLowStock(\@Query('threshold') threshold?: number) {
   *   return this.productsService.findLowStock(threshold || 5);
   * }
   *
   * // 상품 복원 (Soft Delete 취소)
   * \@Post(':id/restore')
   * async restore(\@Param('id') id: string) {
   *   return this.productsService.update(id, { deletedAt: null });
   * }
   * ```
   */
}
