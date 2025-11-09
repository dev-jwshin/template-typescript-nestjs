import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../../common/crud';
import { ProductsService } from '../products.service';
import { ProductSerializer } from '../product.serializer';

/**
 * ProductsController (일반 사용자 API)
 *
 * @description
 * 일반 사용자가 접근하는 Product API 컨트롤러입니다.
 * @Crud 데코레이터를 사용하여 자동으로 CRUD 엔드포인트를 생성합니다.
 *
 * 생성되는 엔드포인트:
 * - GET    /api/products         - 목록 조회 (Index)
 * - GET    /api/products/:id     - 단일 조회 (Show)
 *
 * 제한 사항:
 * - Create, Update, Delete는 관리자만 가능 (admin/ 컨트롤러에서 처리)
 * - 비활성(isActive=false) 상품은 목록에서 자동 제외
 *
 * @see AdminProductsController - 관리자 전용 컨트롤러
 * @see ProductsService - 비즈니스 로직
 */
@Crud({
  /**
   * 생성할 엔드포인트
   *
   * @description
   * CrudOperation enum을 사용하여 필요한 작업만 선택합니다.
   * 일반 사용자는 조회만 가능하도록 Index, Show만 허용합니다.
   *
   * @example
   * ```typescript
   * only: [
   *   CrudOperation.Index,   // GET /products
   *   CrudOperation.Show,    // GET /products/:id
   * ]
   * ```
   */
  only: [
    CrudOperation.Index, // 목록 조회
    CrudOperation.Show, // 단일 조회
  ],

  /**
   * JSON:API 리소스 타입
   *
   * @description
   * JSON:API 응답의 "type" 필드에 사용될 값입니다.
   * 복수형 사용이 권장됩니다.
   *
   * @example
   * ```json
   * {
   *   "jsonapi": { "version": "1.1" },
   *   "data": {
   *     "type": "products",  // ← resourceType
   *     "id": "123",
   *     "attributes": { ... }
   *   }
   * }
   * ```
   */
  resourceType: 'products',

  /**
   * 허용된 필터
   *
   * @description
   * 일반 사용자가 사용할 수 있는 필터를 제한합니다.
   * 서비스에 정의된 allowedFilters의 부분집합입니다.
   *
   * @example
   * ```
   * // API 호출 예시
   * GET /api/products?filter[category][eq]=electronics
   * GET /api/products?filter[name][like]=노트북
   * GET /api/products?filter[price][gte]=1000000&filter[price][lte]=2000000
   * GET /api/products?filter[isActive][eq]=true
   * ```
   *
   * @remarks
   * - isActive=false 상품은 관리자만 볼 수 있도록 필터 제한
   */
  allowedFilters: {
    name: ['eq', 'like', 'ilike'], // 상품명 검색
    category: ['eq', 'in'], // 카테고리 필터링
    price: ['gte', 'lte'], // 가격 범위 필터링
    isActive: ['eq'], // 활성 상태 (보통 true만 허용)
  },

  /**
   * 허용된 정렬 필드
   *
   * @description
   * 일반 사용자가 사용할 수 있는 정렬 필드입니다.
   *
   * @example
   * ```
   * // API 호출 예시
   * GET /api/products?sort=-createdAt      // 최신순
   * GET /api/products?sort=price           // 가격 낮은순
   * GET /api/products?sort=-price          // 가격 높은순
   * GET /api/products?sort=name            // 이름순
   * ```
   */
  allowedSorts: ['createdAt', 'price', 'name'],

  /**
   * 허용된 관계 포함
   *
   * @description
   * ?include= 파라미터로 포함할 수 있는 관계 목록입니다.
   * 현재 Product 모델에는 관계가 없으므로 빈 배열입니다.
   *
   * @example
   * ```
   * // 향후 Category 관계 추가 시
   * allowedIncludes: ['category', 'reviews']
   *
   * // API 호출
   * GET /api/products/123?include=category,reviews
   * ```
   */
  allowedIncludes: [],

  /**
   * 페이지네이션 설정
   *
   * @description
   * 목록 조회 시 페이지네이션 기본값 및 제한값을 설정합니다.
   *
   * @example
   * ```
   * // API 호출 예시
   * GET /api/products                          // 기본: 20개
   * GET /api/products?page[size]=50            // 50개씩
   * GET /api/products?page[number]=2&page[size]=20  // 2페이지
   * ```
   *
   * @remarks
   * - defaultLimit: 클라이언트가 page[size]를 지정하지 않을 때 기본값
   * - limit: 한 번에 조회할 수 있는 최대 개수 (성능 및 부하 방지)
   */
  pagination: {
    defaultLimit: 20, // 기본: 20개씩
    limit: 100, // 최대: 100개까지
  },

  /**
   * 성능 최적화 설정
   *
   * @description
   * - eagerLoad: true → N+1 쿼리 자동 최적화
   * - include 사용 시 JOIN 쿼리로 변환하여 성능 향상
   *
   * @remarks
   * 현재 Product 모델에는 관계가 없지만,
   * 향후 Category 등 관계 추가 시 성능 최적화가 자동 적용됩니다.
   */
  performance: {
    query: {
      eagerLoad: true, // N+1 쿼리 방지
    },
  },

  /**
   * Serializer 설정
   *
   * @description
   * ProductSerializer를 사용하여 응답 직렬화를 처리합니다.
   * - Provider에서 자동으로 인스턴스화하여 SerializerRegistry에 등록
   * - deletedAt 등 민감 정보 자동 제외
   *
   * @see ProductSerializer
   */
  serializer: ProductSerializer,
})
@Controller('products')
export class ProductsController {
  /**
   * 생성자
   *
   * @param productsService - Product 비즈니스 로직 서비스
   *
   * @description
   * NestJS의 의존성 주입을 통해 ProductsService를 주입받습니다.
   * @Crud 데코레이터가 자동으로 이 서비스를 사용하여 CRUD 작업을 처리합니다.
   */
  constructor(private readonly productsService: ProductsService) {}

  /**
   * @Crud 데코레이터가 자동으로 생성하는 메서드:
   *
   * 1. index() - GET /products
   *    - 목록 조회
   *    - 필터링, 정렬, 페이지네이션 지원
   *    - ProductsService.findAll() 호출
   *
   * 2. show(id) - GET /products/:id
   *    - 단일 조회
   *    - ProductsService.findOne(id) 호출
   *
   * 추가 메서드가 필요한 경우 아래에 직접 정의:
   *
   * @example
   * ```typescript
   * // 커스텀 엔드포인트 예시
   * \@Get('by-slug/:slug')
   * async findBySlug(\@Param('slug') slug: string) {
   *   return this.productsService.findBySlug(slug);
   * }
   *
   * \@Get('category/:category')
   * async findByCategory(\@Param('category') category: string) {
   *   return this.productsService.findByCategory(category);
   * }
   *
   * \@Get('low-stock')
   * async findLowStock(\@Query('threshold') threshold?: number) {
   *   return this.productsService.findLowStock(threshold || 5);
   * }
   *
   * \@Get('search')
   * async search(\@Query('q') keyword: string) {
   *   return this.productsService.searchProducts(keyword);
   * }
   * ```
   */
}
