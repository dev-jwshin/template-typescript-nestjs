import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CrudBaseService, CrudConfig, CRUD_CONFIG } from '../../common/crud';
import { PrismaService } from '../../database/prisma.service';
import { Product } from './product.entity';

/**
 * ProductsService
 *
 * @description
 * Product 엔티티의 비즈니스 로직을 처리하는 서비스입니다.
 * CrudBaseService를 상속받아 기본 CRUD 작업이 자동으로 구현됩니다.
 *
 * 자동 구현되는 메서드:
 * - findAll(): 목록 조회 (필터링, 정렬, 페이지네이션 지원)
 * - findOne(id): 단일 조회
 * - create(data): 생성
 * - update(id, data): 수정
 * - remove(id): 삭제 (Soft Delete 지원)
 *
 * @example
 * ```typescript
 * // 컨트롤러에서 사용
 * \@Controller('products')
 * export class ProductsController {
 *   constructor(private readonly productsService: ProductsService) {}
 *
 *   \@Get()
 *   async findAll() {
 *     return this.productsService.findAll({ page: 1, limit: 10 });
 *   }
 * }
 * ```
 */
@Injectable()
export class ProductsService extends CrudBaseService<Product> {
  /**
   * ProductsService 생성자
   *
   * @param prisma - Prisma 클라이언트
   * @param config - Controller의 @Crud 데코레이터에서 정의한 설정 (DI로 주입)
   *
   * @description
   * super()를 통해 CrudBaseService를 초기화합니다.
   * 모든 CRUD 설정은 Controller의 @Crud 데코레이터에서 정의되며,
   * Provider를 통해 DI로 주입받습니다.
   *
   * @remarks
   * - 설정은 Controller에서만 정의 (단일 진실 공급원)
   * - Serializer도 Controller에서 정의하여 자동 등록
   * - Service는 주입받은 설정을 그대로 사용
   */
  constructor(
    prisma: PrismaService,
    @Inject(CRUD_CONFIG) config: CrudConfig,
  ) {
    super(prisma, 'product', config);
  }

  /**
   * 슬러그로 상품 조회
   *
   * @description
   * URL에 친화적인 슬러그를 사용하여 상품을 조회합니다.
   * 슬러그는 데이터베이스에서 unique 제약조건이 적용되어 있습니다.
   *
   * @param slug - 상품 슬러그 (예: "macbook-pro-16-inch-2024")
   * @returns Product 엔티티 또는 null
   *
   * @throws NotFoundException - 슬러그에 해당하는 상품이 없을 경우
   *
   * @example
   * ```typescript
   * // API 호출
   * GET /api/products/by-slug/macbook-pro-16-inch-2024
   *
   * // 컨트롤러
   * \@Get('by-slug/:slug')
   * async findBySlug(\@Param('slug') slug: string) {
   *   return this.productsService.findBySlug(slug);
   * }
   * ```
   */
  async findBySlug(slug: string): Promise<Product> {
    // Prisma를 통해 slug로 조회
    const product = await this.model.findUnique({
      where: { slug },
    });

    // 상품이 없으면 404 에러
    if (!product) {
      throw new NotFoundException(`상품(slug: ${slug})을 찾을 수 없습니다.`);
    }

    // 직렬화 적용 (deletedAt 제외 등)
    return this.serialize(product);
  }

  /**
   * 카테고리별 상품 조회
   *
   * @description
   * 특정 카테고리에 속한 모든 활성 상품을 조회합니다.
   * 최신순으로 정렬됩니다.
   *
   * @param category - 카테고리명 (예: "electronics")
   * @returns Product 배열
   *
   * @example
   * ```typescript
   * // API 호출
   * GET /api/products/category/electronics
   *
   * // 컨트롤러
   * \@Get('category/:category')
   * async findByCategory(\@Param('category') category: string) {
   *   return this.productsService.findByCategory(category);
   * }
   * ```
   */
  async findByCategory(category: string): Promise<Product[]> {
    // Prisma를 통해 카테고리별 조회
    const products = await this.model.findMany({
      where: {
        category,
        isActive: true, // 활성 상품만
      },
      orderBy: {
        createdAt: 'desc', // 최신순
      },
    });

    // 각 상품에 직렬화 적용
    return products.map((product: Product) => this.serialize(product));
  }

  /**
   * 재고 부족 상품 조회
   *
   * @description
   * 재고가 지정된 임계값 이하인 활성 상품을 조회합니다.
   * 재고 관리 및 알림에 사용됩니다.
   *
   * @param threshold - 재고 임계값 (기본값: 5)
   * @returns Product 배열
   *
   * @example
   * ```typescript
   * // API 호출
   * GET /api/products/low-stock?threshold=10
   *
   * // 컨트롤러
   * \@Get('low-stock')
   * async findLowStock(\@Query('threshold') threshold: number = 5) {
   *   return this.productsService.findLowStock(threshold);
   * }
   *
   * // 결과: 재고가 10개 이하인 상품들
   * ```
   */
  async findLowStock(threshold: number = 5): Promise<Product[]> {
    // Prisma를 통해 재고 부족 상품 조회
    const products = await this.model.findMany({
      where: {
        stock: {
          lte: threshold, // 재고가 임계값 이하
        },
        isActive: true, // 활성 상품만
      },
      orderBy: {
        stock: 'asc', // 재고 적은순
      },
    });

    // 각 상품에 직렬화 적용
    return products.map((product: Product) => this.serialize(product));
  }

  /**
   * 상품 검색 (이름, 설명, 태그)
   *
   * @description
   * 여러 필드에서 키워드를 검색합니다.
   * - 이름: 부분 일치 (대소문자 무시)
   * - 설명: 부분 일치 (대소문자 무시)
   * - 태그: 배열 포함 여부
   *
   * @param keyword - 검색 키워드
   * @returns Product 배열
   *
   * @example
   * ```typescript
   * // API 호출
   * GET /api/products/search?q=노트북
   *
   * // 컨트롤러
   * \@Get('search')
   * async search(\@Query('q') keyword: string) {
   *   return this.productsService.searchProducts(keyword);
   * }
   * ```
   */
  async searchProducts(keyword: string): Promise<Product[]> {
    // Prisma를 통해 다중 필드 검색
    const products = await this.model.findMany({
      where: {
        OR: [
          {
            name: {
              contains: keyword, // 이름에 키워드 포함 (PostgreSQL은 기본 대소문자 구분)
              mode: 'insensitive', // 대소문자 무시
            },
          },
          {
            description: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            tags: {
              has: keyword, // 태그 배열에 키워드 포함
            },
          },
        ],
        isActive: true, // 활성 상품만
      },
      orderBy: {
        createdAt: 'desc', // 최신순
      },
    });

    // 각 상품에 직렬화 적용
    return products.map((product: Product) => this.serialize(product));
  }
}
