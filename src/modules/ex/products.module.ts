import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './api/products.controller';
import { AdminProductsController } from './admin/products.controller';
import { createCrudConfigProvider } from '../../common/crud';

/**
 * ProductsModule
 *
 * @description
 * Product 기능을 담당하는 NestJS 모듈입니다.
 * 모듈 시스템을 통해 관심사를 분리하고 재사용성을 높입니다.
 *
 * 주요 구성요소:
 * - Controllers: API 엔드포인트 정의
 *   - ProductsController: 일반 사용자 API (조회만)
 *   - AdminProductsController: 관리자 API (전체 CRUD)
 *
 * - Providers: 비즈니스 로직 및 서비스
 *   - ProductsService: Product 비즈니스 로직
 *
 * - Serializer: 응답 직렬화 (자동 등록) ⭐
 *   - ProductSerializer: deletedAt 필드 제외 등
 *   - ProductsService 생성 시 SerializerRegistry에 자동 등록됨
 *
 * @example
 * ```typescript
 * // app.module.ts에서 import
 * import { ProductsModule } from './modules/products/products.module';
 *
 * \@Module({
 *   imports: [
 *     ProductsModule,  // ← 여기에 추가
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  /**
   * 컨트롤러 목록
   *
   * @description
   * 이 모듈에서 제공하는 API 엔드포인트를 정의하는 컨트롤러입니다.
   *
   * - ProductsController:
   *   - 경로: /products
   *   - 작업: Index (목록), Show (단일 조회)
   *   - 대상: 일반 사용자
   *
   * - AdminProductsController:
   *   - 경로: /admin/products
   *   - 작업: Index, Show, Create, Update, Delete
   *   - 대상: 관리자
   *
   * @remarks
   * 컨트롤러는 라우팅과 요청 처리를 담당하며,
   * 비즈니스 로직은 서비스 계층(ProductsService)에 위임합니다.
   */
  controllers: [
    ProductsController, // 일반 사용자 API
    AdminProductsController, // 관리자 API
  ],

  /**
   * 프로바이더 목록
   *
   * @description
   * 이 모듈에서 제공하는 서비스 및 의존성 주입 가능한 객체입니다.
   *
   * - ProductsService:
   *   - CrudBaseService를 상속받아 기본 CRUD 작업 자동 구현
   *   - Controller의 @Crud 데코레이터 설정을 DI로 주입받음
   *   - 커스텀 비즈니스 로직 추가 가능
   *
   * - createCrudConfigProvider(ProductsController):
   *   - @Crud 데코레이터에서 정의한 설정을 Service에 주입하는 Provider
   *   - CRUD_CONFIG 토큰으로 설정을 제공
   *   - Serializer 자동 인스턴스화 및 등록
   *
   * @example
   * ```typescript
   * // 다른 모듈에서 ProductsService 사용하기
   * export class OrdersModule {
   *   imports: [ProductsModule],  // ProductsModule import 필요
   * }
   *
   * export class OrdersService {
   *   constructor(
   *     private readonly productsService: ProductsService,  // 주입 가능
   *   ) {}
   * }
   * ```
   */
  providers: [
    ProductsService,
    createCrudConfigProvider(ProductsController), // ⭐ CRUD 설정 Provider
  ],

  /**
   * Export 목록
   *
   * @description
   * 다른 모듈에서 사용할 수 있도록 공개하는 프로바이더입니다.
   *
   * - ProductsService를 export하면:
   *   - 다른 모듈에서 import하여 사용 가능
   *   - 예: OrdersModule에서 상품 정보 조회 시 사용
   *
   * @example
   * ```typescript
   * // orders.module.ts
   * import { ProductsModule } from '../products/products.module';
   *
   * \@Module({
   *   imports: [ProductsModule],  // ProductsModule import
   * })
   * export class OrdersModule {}
   *
   * // orders.service.ts
   * import { ProductsService } from '../products/products.service';
   *
   * export class OrdersService {
   *   constructor(
   *     private readonly productsService: ProductsService,  // 주입 사용
   *   ) {}
   *
   *   async createOrder(productId: string) {
   *     const product = await this.productsService.findOne(productId);
   *     // 주문 생성 로직...
   *   }
   * }
   * ```
   */
  exports: [ProductsService],
})
export class ProductsModule {
  /**
   * Decorator 중심 설정 아키텍처 ⭐
   *
   * @description
   * 모든 CRUD 설정은 Controller의 @Crud 데코레이터에서 정의됩니다.
   * - 설정은 한 곳(Controller)에서만 정의 (단일 진실 공급원)
   * - Provider가 설정을 Service에 자동 주입
   * - Serializer도 자동으로 인스턴스화하여 등록
   *
   * @remarks
   * - Controller: @Crud 데코레이터로 모든 설정 정의
   * - Module: createCrudConfigProvider로 Provider 생성
   * - Service: @Inject(CRUD_CONFIG)로 설정 주입받음
   * - OnModuleInit 구현 불필요 (자동화!)
   *
   * @example
   * ```typescript
   * // 1. Controller에서 설정 정의
   * @Crud({
   *   resourceType: 'products',
   *   allowedFilters: { name: ['eq', 'like'] },
   *   serializer: ProductSerializer,  // ← Class 전달
   * })
   * @Controller('products')
   * export class ProductsController {}
   *
   * // 2. Module에서 Provider 등록
   * @Module({
   *   providers: [
   *     ProductsService,
   *     createCrudConfigProvider(ProductsController),  // ← 자동 설정 주입
   *   ],
   * })
   * export class ProductsModule {}
   *
   * // 3. Service에서 DI로 주입받음
   * @Injectable()
   * export class ProductsService extends CrudBaseService<Product> {
   *   constructor(
   *     prisma: PrismaService,
   *     @Inject(CRUD_CONFIG) config: CrudConfig,  // ← DI로 주입
   *   ) {
   *     super(prisma, 'product', config);
   *   }
   * }
   * ```
   *
   * @see ProductsController - @Crud 데코레이터 설정
   * @see createCrudConfigProvider - CRUD 설정 Provider 팩토리
   * @see CrudBaseService - 베이스 서비스
   */
}
