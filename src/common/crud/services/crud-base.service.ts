import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaQueryBuilder } from '../builders';
import { CrudConfig, FilterOperator } from '../types';
import { PaginatedResponse } from '../../dto/jsonapi-query.dto';
import { ServiceRegistry } from '../registry/service-registry';
import { SerializerRegistry } from '../serializers/serializer-registry';
import { CrudConfigMetadataStorage } from '../metadata/crud-config-metadata.storage';

/**
 * CRUD 기본 서비스
 *
 * N+1 쿼리 최적화 및 표준 CRUD 작업을 제공하는 베이스 서비스입니다.
 * 다른 서비스에서 상속받아 사용합니다.
 *
 * @example
 * ```typescript
 * // Controller에서 @Crud 데코레이터로 설정 정의
 * @Crud({
 *   only: [CrudOperation.Index, CrudOperation.Show, CrudOperation.Create],
 *   resourceType: 'users',
 *   allowedIncludes: ['profile', 'roles'],
 *   allowedFilters: { name: ['eq', 'like'], isActive: ['eq'] },
 *   performance: { query: { eagerLoad: true } }
 * })
 * @Controller('users')
 * export class UsersController {
 *   constructor(private readonly usersService: UsersService) {}
 * }
 *
 * // Service에서 DI로 설정 주입받기
 * @Injectable()
 * export class UsersService extends CrudBaseService<User> {
 *   constructor(
 *     prisma: PrismaService,
 *     @Inject(CRUD_CONFIG) config: CrudConfig,
 *   ) {
 *     super(prisma, 'user', config);
 *   }
 * }
 *
 * // Module에서 Provider 등록
 * @Module({
 *   controllers: [UsersController],
 *   providers: [
 *     UsersService,
 *     createCrudConfigProvider(UsersController),
 *   ],
 * })
 * export class UsersModule {}
 * ```
 */
@Injectable()
export abstract class CrudBaseService<T = any> {
  protected queryBuilder: PrismaQueryBuilder;

  /**
   * @param prisma Prisma 서비스
   * @param modelName Prisma 모델 이름 (소문자, 예: 'user', 'post')
   * @param config CRUD 설정 (선택사항, 미제공 시 Convention-over-Configuration으로 자동 조회)
   *
   * @example
   * ```typescript
   * // 방법 1: DI 기반 (기존 방식, 하위 호환성)
   * constructor(
   *   prisma: PrismaService,
   *   @Inject(CRUD_CONFIG) config: CrudConfig,
   * ) {
   *   super(prisma, 'product', config);
   * }
   *
   * // 방법 2: Convention-over-Configuration (권장 ⭐)
   * constructor(prisma: PrismaService) {
   *   super(prisma, 'product');  // ✨ config 자동 조회!
   * }
   * ```
   */
  constructor(
    protected readonly prisma: PrismaService,
    modelName: string,
    config?: CrudConfig,
  ) {
    this.queryBuilder = new PrismaQueryBuilder();
    this.modelName = modelName;

    // 기본값 설정 (권장값)
    const defaultConfig: Partial<CrudConfig> = {
      pagination: {
        defaultLimit: 20,
        limit: 100,
      },
      performance: {
        query: {
          eagerLoad: true, // N+1 쿼리 자동 최적화
        },
      },
    };

    // Convention-over-Configuration: config가 없으면 자동 조회
    let resolvedConfig = config;
    if (!resolvedConfig) {
      resolvedConfig = this.loadConfigByConvention();
    }

    // 최소한의 안전한 설정 (config 조회 실패 시에도 동작하도록)
    const safeConfig = resolvedConfig || {
      only: [], // 빈 배열이지만 undefined 방지
      allowedFilters: {},
      allowedSorts: [],
      allowedIncludes: [],
    };

    // 사용자 설정으로 기본값 override
    this.config = {
      ...defaultConfig,
      ...safeConfig,
      pagination: {
        ...defaultConfig.pagination,
        ...safeConfig.pagination,
      },
      performance: {
        ...defaultConfig.performance,
        ...safeConfig.performance,
        query: {
          ...defaultConfig.performance?.query,
          ...safeConfig.performance?.query,
        },
      },
    } as CrudConfig;

    // 서비스 레지스트리에 자동 등록
    ServiceRegistry.register(this.modelName, this);

    // Serializer 자동 등록
    this.autoRegisterSerializer();
  }

  /**
   * Convention-over-Configuration으로 CrudConfig 자동 조회
   *
   * @description
   * Service 이름에서 Controller 이름을 추론하여 @Crud 설정을 자동 조회합니다.
   * 예: ProductsService → ProductsController → CrudConfig
   *
   * @returns CrudConfig 또는 undefined
   *
   * @example
   * ```typescript
   * // ProductsService → ProductsController의 @Crud 설정 자동 조회
   * class ProductsService extends CrudBaseService<Product> {
   *   constructor(prisma: PrismaService) {
   *     super(prisma, 'product');  // ✨ config 자동 조회!
   *   }
   * }
   * ```
   */
  private loadConfigByConvention(): CrudConfig | undefined {
    const serviceName = this.constructor.name; // "ProductsService"
    const config = CrudConfigMetadataStorage.getByServiceName(serviceName);

    if (config) {
      console.log(
        `[CrudBaseService] Config 자동 조회 성공: ${serviceName} → ${config.resourceType || this.modelName}`,
      );
    } else {
      console.warn(
        `[CrudBaseService] Config 자동 조회 실패: ${serviceName}. ` +
          `Controller에 @Crud 데코레이터가 적용되지 않았거나 명명 규칙을 따르지 않습니다. ` +
          `(기대: ${serviceName.replace('Service', 'Controller')})`,
      );
    }

    return config;
  }

  /**
   * Serializer 자동 등록
   *
   * @description
   * 다음 순서로 Serializer를 찾아 SerializerRegistry에 자동 등록합니다:
   * 1. config.serializer가 제공된 경우 해당 Serializer 사용
   * 2. 이미 등록된 Serializer가 있으면 건너뜀
   *
   * @remarks
   * - @Crud 데코레이터에서 serializer를 전달하면 자동으로 인스턴스화하여 등록
   * - 모듈의 onModuleInit()에서 수동 등록도 여전히 가능 (하위 호환성)
   *
   * @example
   * ```typescript
   * // 방법 1: @Crud 데코레이터에서 Serializer 전달 (권장)
   * @Crud({
   *   only: [CrudOperation.Index, CrudOperation.Show],
   *   resourceType: 'users',
   *   serializer: UserSerializer,  // ← Class 전달, Provider에서 인스턴스화됨
   * })
   * @Controller('users')
   * export class UsersController {}
   *
   * // 방법 2: 모듈에서 수동 등록 (기존 방식, 여전히 작동)
   * // users.module.ts
   * onModuleInit() {
   *   SerializerRegistry.register('user', new UserSerializer());
   * }
   * ```
   */
  private autoRegisterSerializer(): void {
    // 1. config.serializer가 제공된 경우
    if (this.config.serializer) {
      SerializerRegistry.register(this.modelName, this.config.serializer);
      console.log(`[CrudBaseService] Serializer 자동 등록 완료: ${this.modelName}`);
      return;
    }

    // 2. 이미 등록된 Serializer가 있으면 건너뜀
    if (SerializerRegistry.has(this.modelName)) {
      console.log(`[CrudBaseService] Serializer 이미 등록됨: ${this.modelName}`);
      return;
    }

    // 3. Serializer가 없으면 경고 (선택사항)
    console.warn(
      `[CrudBaseService] Serializer가 등록되지 않음: ${this.modelName}. ` +
        `config.serializer를 전달하거나 모듈의 onModuleInit()에서 수동 등록하세요.`,
    );
  }

  // modelName과 config를 readonly로 변경
  protected readonly modelName: string;
  protected readonly config: CrudConfig;

  /**
   * Prisma 모델 접근자
   */
  protected get model(): any {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * 목록 조회 (N+1 쿼리 최적화 포함)
   *
   * @param options 쿼리 옵션
   * @returns 엔티티 배열 또는 페이지네이션된 응답
   */
  async findAll(options?: {
    fields?: string[];
    filter?: Record<string, any>;
    sort?: Array<{ field: string; order: 'ASC' | 'DESC' }>;
    page?: { number: number; size: number };
  }): Promise<T[] | PaginatedResponse<T>> {
    // Prisma 쿼리 구성
    const query = this.queryBuilder.buildQuery({
      allowedIncludes: this.config.allowedIncludes,
      allowedFilters: this.config.allowedFilters,
      filterValues: options?.filter,
      sort: options?.sort,
      page: options?.page,
      fields: options?.fields,
      eagerLoad: this.config.performance?.query?.eagerLoad ?? true,
    });

    // 페이지네이션이 있는 경우
    if (options?.page) {
      const [items, totalItems] = await Promise.all([
        this.model.findMany(query),
        this.model.count({ where: query.where }),
      ]);

      const serializedItems = items.map((item: any) => this.serialize(item));
      const totalPages = Math.ceil(totalItems / options.page.size);

      return {
        items: serializedItems,
        meta: {
          currentPage: options.page.number,
          pageSize: options.page.size,
          totalItems,
          totalPages,
        },
      };
    }

    // 페이지네이션이 없는 경우
    const items = await this.model.findMany(query);
    return items.map((item: any) => this.serialize(item));
  }

  /**
   * ID로 단일 조회
   *
   * @param id 엔티티 ID
   * @param fields 반환할 필드 (Sparse Fieldsets)
   * @returns 엔티티
   * @throws NotFoundException
   */
  async findOne(id: string, fields?: string[]): Promise<T> {
    const query: any = {
      where: { id },
    };

    // N+1 최적화: Eager Loading
    if (this.config.performance?.query?.eagerLoad && this.config.allowedIncludes) {
      const include = this.queryBuilder.buildIncludeClause(this.config.allowedIncludes);
      if (include && Object.keys(include).length > 0) {
        query.include = include;
      }
    }

    // Sparse Fieldsets
    if (fields && fields.length > 0) {
      const select = this.queryBuilder.buildSelectClause(fields);
      if (select && !query.include) {
        query.select = select;
      }
    }

    const entity = await this.model.findUnique(query);

    if (!entity) {
      throw new NotFoundException(`${this.modelName} ID ${id}를 찾을 수 없습니다.`);
    }

    return this.serialize(entity);
  }

  /**
   * 엔티티 생성
   *
   * @param createDto 생성 DTO
   * @returns 생성된 엔티티
   */
  async create(createDto: any): Promise<T> {
    const entity = await this.model.create({
      data: createDto,
    });

    return this.serialize(entity);
  }

  /**
   * 엔티티 수정
   *
   * @param id 엔티티 ID
   * @param updateDto 수정 DTO
   * @returns 수정된 엔티티
   * @throws NotFoundException
   */
  async update(id: string, updateDto: any): Promise<T> {
    // 존재 여부 확인
    const existingEntity = await this.model.findUnique({ where: { id } });
    if (!existingEntity) {
      throw new NotFoundException(`${this.modelName} ID ${id}를 찾을 수 없습니다.`);
    }

    const entity = await this.model.update({
      where: { id },
      data: updateDto,
    });

    return this.serialize(entity);
  }

  /**
   * 엔티티 삭제
   *
   * @param id 엔티티 ID
   * @returns 삭제 성공 메시지
   * @throws NotFoundException
   */
  async remove(id: string): Promise<{ message: string }> {
    // 존재 여부 확인
    const existingEntity = await this.model.findUnique({ where: { id } });
    if (!existingEntity) {
      throw new NotFoundException(`${this.modelName} ID ${id}를 찾을 수 없습니다.`);
    }

    await this.model.delete({
      where: { id },
    });

    return {
      message: `${this.modelName} ID ${id}가 삭제되었습니다.`,
    };
  }

  /**
   * 엔티티 직렬화 (파일 기반 Serializer 사용)
   *
   * {module}.serializer.ts 파일을 통해 직렬화를 수행합니다.
   * Serializer가 등록되지 않은 경우 원본 데이터를 반환합니다.
   *
   * @param entity 원본 엔티티
   * @returns 직렬화된 엔티티
   */
  protected serialize(entity: any): T {
    if (!entity) {
      return entity;
    }

    // 배열인 경우 각 항목 직렬화
    if (Array.isArray(entity)) {
      return entity.map((item) => this.serialize(item)) as any;
    }

    // 파일 기반 Serializer 사용 (SerializerRegistry)
    const fileBasedSerializer = SerializerRegistry.get(this.modelName);
    if (fileBasedSerializer) {
      const serializerRegistry = SerializerRegistry.getAll();
      return fileBasedSerializer.serialize(entity, serializerRegistry) as T;
    }

    // Serializer가 등록되지 않은 경우 원본 반환
    return entity;
  }

  /**
   * 외부에서 serialize 호출 가능하도록 public 메서드 제공
   *
   * @param entity 원본 엔티티
   * @returns 직렬화된 엔티티
   */
  public serializeEntity(entity: any): T {
    return this.serialize(entity);
  }
}
