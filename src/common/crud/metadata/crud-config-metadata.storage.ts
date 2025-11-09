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
 *
 * @example
 * ```typescript
 * // 1. @Crud 데코레이터에서 저장
 * @Crud({
 *   allowedFilters: { name: ['eq'] },
 *   serializer: ProductSerializer,
 * })
 * class ProductsController {}
 *
 * // CrudConfigMetadataStorage.set(ProductsController, config)
 *
 * // 2. Service에서 주입받음
 * class ProductsService extends CrudBaseService {
 *   constructor(
 *     prisma: PrismaService,
 *     @Inject(CRUD_CONFIG) config: CrudConfig,
 *   ) {
 *     super(prisma, 'product', config);
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
   * CrudConfig 저장
   *
   * @param target Controller 클래스
   * @param config CRUD 설정
   */
  static set(target: Function, config: CrudConfig): void {
    this.configs.set(target, config);
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
  }
}
