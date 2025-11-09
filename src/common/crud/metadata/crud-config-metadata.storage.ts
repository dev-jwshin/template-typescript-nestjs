import { CrudConfig } from '../types/crud-config.interface';

/**
 * CrudConfig 메타데이터 저장소
 *
 * @description
 * @Crud 데코레이터에서 설정한 CrudConfig를 Controller별로 저장하고 관리합니다.
 * Service에서 Dependency Injection을 통해 해당 설정을 주입받을 수 있도록 합니다.
 *
 * 주요 기능:
 * - Controller별 CrudConfig 저장
 * - Service에서 설정 조회
 * - 설정 중복 방지 (단일 진실 공급원)
 * - Convention-over-Configuration: Service 이름 기반 자동 조회
 *
 * @example
 * ```typescript
 * // 방법 1: DI 기반 (기존 방식, 하위 호환성)
 * @Crud({
 *   allowedFilters: { name: ['eq'] },
 *   serializer: ProductSerializer,
 * })
 * class ProductsController {}
 *
 * class ProductsService extends CrudBaseService {
 *   constructor(
 *     prisma: PrismaService,
 *     @Inject(CRUD_CONFIG) config: CrudConfig,
 *   ) {
 *     super(prisma, 'product', config);
 *   }
 * }
 *
 * // 방법 2: Convention-over-Configuration (신규 방식)
 * @Crud({
 *   allowedFilters: { name: ['eq'] },
 *   serializer: ProductSerializer,
 * })
 * class ProductsController {}
 *
 * class ProductsService extends CrudBaseService {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'product');  // ✨ config 자동 조회!
 *   }
 * }
 * ```
 */
export class CrudConfigMetadataStorage {
  /**
   * Controller → CrudConfig 매핑
   */
  private static configs = new Map<Function, CrudConfig>();

  /**
   * ServiceName → ControllerClass 매핑 (Convention-over-Configuration)
   *
   * @example
   * 'ProductsService' → ProductsController
   * 'UsersService' → UsersController
   */
  private static serviceToController = new Map<string, Function>();

  /**
   * CrudConfig 저장
   *
   * @param target Controller 클래스
   * @param config CRUD 설정
   */
  static set(target: Function, config: CrudConfig): void {
    this.configs.set(target, config);

    // Convention-over-Configuration: ServiceName 자동 매핑
    // 예: ProductsController → ProductsService
    const controllerName = target.name; // "ProductsController"
    const serviceName = controllerName.replace('Controller', 'Service'); // "ProductsService"
    this.serviceToController.set(serviceName, target);
  }

  /**
   * CrudConfig 조회
   *
   * @param target Controller 클래스
   * @returns CRUD 설정 또는 undefined
   */
  static get(target: Function): CrudConfig | undefined {
    return this.configs.get(target);
  }

  /**
   * CrudConfig 존재 여부 확인
   *
   * @param target Controller 클래스
   * @returns 존재 여부
   */
  static has(target: Function): boolean {
    return this.configs.has(target);
  }

  /**
   * 모든 CrudConfig 조회
   *
   * @returns Controller → CrudConfig 맵
   */
  static getAll(): Map<Function, CrudConfig> {
    return new Map(this.configs);
  }

  /**
   * CrudConfig 삭제 (테스트 용도)
   *
   * @param target Controller 클래스
   */
  static delete(target: Function): void {
    this.configs.delete(target);
  }

  /**
   * 모든 CrudConfig 초기화 (테스트 용도)
   */
  static clear(): void {
    this.configs.clear();
    this.serviceToController.clear();
  }

  /**
   * ServiceName으로 CrudConfig 조회 (Convention-over-Configuration)
   *
   * @param serviceName Service 클래스 이름 (예: 'ProductsService')
   * @returns CRUD 설정 또는 undefined
   *
   * @example
   * ```typescript
   * // Service에서 자동 조회
   * class ProductsService extends CrudBaseService {
   *   constructor(prisma: PrismaService) {
   *     super(prisma, 'product');
   *     // → 내부적으로 CrudConfigMetadataStorage.getByServiceName('ProductsService') 호출
   *   }
   * }
   * ```
   */
  static getByServiceName(serviceName: string): CrudConfig | undefined {
    const controllerClass = this.serviceToController.get(serviceName);
    if (!controllerClass) {
      return undefined;
    }
    return this.configs.get(controllerClass);
  }

  /**
   * ServiceName으로 Controller 조회 (디버깅 용도)
   *
   * @param serviceName Service 클래스 이름
   * @returns Controller 클래스 또는 undefined
   */
  static getControllerByServiceName(serviceName: string): Function | undefined {
    return this.serviceToController.get(serviceName);
  }
}
