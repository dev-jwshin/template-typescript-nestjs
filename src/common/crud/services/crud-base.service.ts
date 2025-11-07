import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaQueryBuilder } from '../builders';
import { CrudConfig, CrudOperation, FilterOperator } from '../types';
import { PaginatedResponse } from '../../dto/jsonapi-query.dto';

/**
 * CRUD 기본 서비스
 *
 * N+1 쿼리 최적화 및 표준 CRUD 작업을 제공하는 베이스 서비스입니다.
 * 다른 서비스에서 상속받아 사용합니다.
 *
 * 사용 예시:
 * ```typescript
 * @Injectable()
 * export class UsersService extends CrudBaseService<User> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'user', {
 *       allowedIncludes: ['profile', 'roles'],
 *       allowedFilters: { name: ['eq', 'like'], isActive: ['eq'] },
 *       performance: { query: { eagerLoad: true } }
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class CrudBaseService<T = any> {
  protected queryBuilder: PrismaQueryBuilder;

  /**
   * @param prisma Prisma 서비스
   * @param modelName Prisma 모델 이름 (소문자, 예: 'user', 'post')
   * @param config CRUD 설정 (일부)
   */
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
    protected readonly config: {
      allowedIncludes?: string[];
      allowedFilters?: Record<string, FilterOperator[]>;
      allowedSorts?: string[];
      performance?: { query?: { eagerLoad?: boolean } };
      serialize?: {
        exclude?: string[];
        transform?: (data: any) => any;
      };
    },
  ) {
    this.queryBuilder = new PrismaQueryBuilder();
  }

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
      eagerLoad: this.config.performance?.query?.eagerLoad || false,
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
      const include = this.queryBuilder.buildIncludeClause(
        this.config.allowedIncludes,
      );
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
      throw new NotFoundException(
        `${this.modelName} ID ${id}를 찾을 수 없습니다.`,
      );
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
      throw new NotFoundException(
        `${this.modelName} ID ${id}를 찾을 수 없습니다.`,
      );
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
      throw new NotFoundException(
        `${this.modelName} ID ${id}를 찾을 수 없습니다.`,
      );
    }

    await this.model.delete({
      where: { id },
    });

    return {
      message: `${this.modelName} ID ${id}가 삭제되었습니다.`,
    };
  }

  /**
   * 엔티티 직렬화 (민감한 필드 제거)
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

    // 제외할 필드 제거
    if (this.config.serialize?.exclude) {
      const serialized = { ...entity };
      this.config.serialize.exclude.forEach((field) => {
        delete serialized[field];
      });
      entity = serialized;
    }

    // 커스텀 변환 함수 적용
    if (this.config.serialize?.transform) {
      entity = this.config.serialize.transform(entity);
    }

    return entity;
  }
}
