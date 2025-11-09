/**
 * CRUD 설정 Injection Token
 *
 * @description
 * @Crud 데코레이터에서 정의한 CrudConfig를 Service에 주입하기 위한 토큰입니다.
 *
 * 사용 방법:
 * 1. Controller에서 @Crud 데코레이터로 설정 정의
 * 2. Service 생성자에서 @Inject(CRUD_CONFIG)로 설정 주입받음
 *
 * @example
 * ```typescript
 * // Service에서 사용
 * import { CRUD_CONFIG } from '../../common/crud/constants/crud-config.token';
 *
 * @Injectable()
 * export class ProductsService extends CrudBaseService<Product> {
 *   constructor(
 *     prisma: PrismaService,
 *     @Inject(CRUD_CONFIG) config: CrudConfig,
 *   ) {
 *     super(prisma, 'product', config);
 *   }
 * }
 * ```
 */
export const CRUD_CONFIG = Symbol('CRUD_CONFIG');
