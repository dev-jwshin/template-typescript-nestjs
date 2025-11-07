import { FilterOperator } from '../types';

/**
 * Prisma 쿼리 빌더
 *
 * JSON:API 쿼리를 Prisma 쿼리로 변환합니다.
 * N+1 쿼리 자동 최적화 (include 자동 생성)를 지원합니다.
 */
export class PrismaQueryBuilder {
  /**
   * N+1 쿼리 최적화: allowedIncludes 기반 include 절 자동 생성
   *
   * 중첩 관계를 자동으로 Prisma include 구조로 변환합니다.
   *
   * 예시:
   * Input: ['profile', 'profile.attachments', 'roles', 'roles.permissions']
   * Output: {
   *   profile: { include: { attachments: true } },
   *   roles: { include: { permissions: true } }
   * }
   *
   * @param allowedIncludes 허용된 관계 목록 (점(.)으로 중첩 표현)
   * @returns Prisma include 객체
   */
  buildIncludeClause(allowedIncludes: string[]): any {
    if (!allowedIncludes || allowedIncludes.length === 0) {
      return undefined;
    }

    const include: any = {};

    allowedIncludes.forEach((path) => {
      const parts = path.split('.');
      let current = include;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // 마지막 부분: true로 설정
          current[part] = true;
        } else {
          // 중간 부분: include 객체 생성
          if (!current[part]) {
            current[part] = { include: {} };
          } else if (current[part] === true) {
            // 이미 true로 설정된 경우 include 객체로 변환
            current[part] = { include: {} };
          }
          current = current[part].include;
        }
      });
    });

    return include;
  }

  /**
   * 필터 절 구성 (WHERE 절)
   *
   * JSON:API 필터를 Prisma where 절로 변환합니다.
   * 복잡한 필터 연산자를 지원합니다.
   *
   * @param allowedFilters 허용된 필터 설정 (필드명 → 연산자 배열)
   * @param filterValues 클라이언트 요청 필터 값
   * @returns Prisma where 객체
   */
  buildWhereClause(
    allowedFilters: Record<string, FilterOperator[]> | undefined,
    filterValues: Record<string, any> | undefined,
  ): any {
    if (!allowedFilters || !filterValues) {
      return {};
    }

    const where: any = {};

    Object.keys(filterValues).forEach((field) => {
      // 허용되지 않은 필터는 무시
      if (!allowedFilters[field]) {
        return;
      }

      const value = filterValues[field];

      // 단순 값인 경우 (연산자 없음) - 기본적으로 'eq' 연산자 사용
      if (typeof value !== 'object' || value === null) {
        where[field] = this.applyOperator('eq', value, field);
        return;
      }

      // 객체 형태: { operator: value } 구조
      Object.keys(value).forEach((operator) => {
        const filterValue = value[operator];
        const filterOperator = operator as FilterOperator;

        // 허용된 연산자인지 확인
        if (!allowedFilters[field].includes(filterOperator)) {
          return;
        }

        const operatorResult = this.applyOperator(filterOperator, filterValue, field);

        // 기존 where[field]가 있으면 병합, 없으면 새로 설정
        if (where[field] && typeof where[field] === 'object' && typeof operatorResult === 'object') {
          where[field] = { ...where[field], ...operatorResult };
        } else {
          where[field] = operatorResult;
        }
      });
    });

    return where;
  }

  /**
   * 필터 연산자 적용
   *
   * @param operator 필터 연산자
   * @param value 필터 값
   * @param field 필드명
   * @returns Prisma 필터 조건
   */
  private applyOperator(
    operator: FilterOperator,
    value: any,
    field: string,
  ): any {
    switch (operator) {
      case 'eq':
        return { equals: this.parseValue(value) };

      case 'ne':
        return { not: this.parseValue(value) };

      case 'gt':
        return { gt: this.parseValue(value) };

      case 'gte':
        return { gte: this.parseValue(value) };

      case 'lt':
        return { lt: this.parseValue(value) };

      case 'lte':
        return { lte: this.parseValue(value) };

      case 'like':
        return { contains: value };

      case 'ilike':
        return { contains: value, mode: 'insensitive' };

      case 'in':
        return { in: this.parseArrayValue(value) };

      case 'nin':
        return { notIn: this.parseArrayValue(value) };

      case 'between':
        const range = this.parseArrayValue(value);
        if (range.length === 2) {
          return { gte: this.parseValue(range[0]), lte: this.parseValue(range[1]) };
        }
        return undefined;

      case 'isNull':
        return null;

      case 'isNotNull':
        return { not: null };

      default:
        return this.parseValue(value);
    }
  }

  /**
   * 값 파싱 (타입 변환)
   *
   * @param value 원본 값
   * @returns 파싱된 값
   */
  private parseValue(value: any): any {
    // Boolean 변환
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Number 변환
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return Number(value);
    }

    return value;
  }

  /**
   * 배열 값 파싱 (쉼표로 구분된 문자열을 배열로 변환)
   *
   * @param value 원본 값 (배열 또는 쉼표로 구분된 문자열)
   * @returns 파싱된 배열
   */
  private parseArrayValue(value: any): any[] {
    // 이미 배열인 경우
    if (Array.isArray(value)) {
      return value.map((v) => this.parseValue(v));
    }

    // 쉼표로 구분된 문자열인 경우
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map((v) => this.parseValue(v.trim()));
    }

    // 단일 값인 경우 배열로 변환
    return [this.parseValue(value)];
  }

  /**
   * 정렬 절 구성 (ORDER BY 절)
   *
   * JSON:API 정렬을 Prisma orderBy 절로 변환합니다.
   *
   * 예시:
   * Input: [{ field: 'createdAt', order: 'DESC' }, { field: 'name', order: 'ASC' }]
   * Output: [{ createdAt: 'desc' }, { name: 'asc' }]
   *
   * @param sort 정렬 조건 배열
   * @returns Prisma orderBy 배열
   */
  buildOrderByClause(
    sort: Array<{ field: string; order: 'ASC' | 'DESC' }> | undefined,
  ): any {
    if (!sort || sort.length === 0) {
      return undefined;
    }

    return sort.map(({ field, order }) => ({
      [field]: order.toLowerCase(),
    }));
  }

  /**
   * 페이지네이션 절 구성 (LIMIT/OFFSET)
   *
   * JSON:API 페이지네이션을 Prisma skip/take로 변환합니다.
   *
   * @param page 페이지 정보 { number: 페이지 번호, size: 페이지 크기 }
   * @returns { skip: number, take: number } 또는 빈 객체
   */
  buildPaginationClause(
    page: { number: number; size: number } | undefined,
  ): { skip?: number; take?: number } {
    if (!page) {
      return {};
    }

    return {
      skip: (page.number - 1) * page.size,
      take: page.size,
    };
  }

  /**
   * Sparse Fieldsets 절 구성 (SELECT 절)
   *
   * JSON:API Sparse Fieldsets를 Prisma select로 변환합니다.
   *
   * @param fields 반환할 필드 목록
   * @returns Prisma select 객체
   */
  buildSelectClause(fields: string[] | undefined): any {
    if (!fields || fields.length === 0) {
      return undefined;
    }

    const select: any = {};
    fields.forEach((field) => {
      select[field] = true;
    });

    // ID는 항상 포함 (JSON:API 스펙)
    select.id = true;

    return select;
  }

  /**
   * 완전한 Prisma 쿼리 구성
   *
   * 모든 쿼리 옵션을 조합하여 완전한 Prisma 쿼리 객체를 생성합니다.
   *
   * @param options 쿼리 옵션
   * @returns Prisma 쿼리 객체
   */
  buildQuery(options: {
    allowedIncludes?: string[];
    allowedFilters?: Record<string, FilterOperator[]>;
    filterValues?: Record<string, any>;
    sort?: Array<{ field: string; order: 'ASC' | 'DESC' }>;
    page?: { number: number; size: number };
    fields?: string[];
    eagerLoad?: boolean;
  }): any {
    const query: any = {};

    // WHERE 절
    const where = this.buildWhereClause(
      options.allowedFilters,
      options.filterValues,
    );
    if (Object.keys(where).length > 0) {
      query.where = where;
    }

    // ORDER BY 절
    const orderBy = this.buildOrderByClause(options.sort);
    if (orderBy) {
      query.orderBy = orderBy;
    }

    // LIMIT/OFFSET 절
    const pagination = this.buildPaginationClause(options.page);
    if (pagination) {
      query.skip = pagination.skip;
      query.take = pagination.take;
    }

    // N+1 최적화: INCLUDE 절 (eagerLoad가 true인 경우)
    if (options.eagerLoad && options.allowedIncludes) {
      const include = this.buildIncludeClause(options.allowedIncludes);
      if (include && Object.keys(include).length > 0) {
        query.include = include;
      }
    }

    // SELECT 절 (Sparse Fieldsets)
    // 주의: include와 select는 함께 사용 불가
    if (!query.include && options.fields) {
      const select = this.buildSelectClause(options.fields);
      if (select) {
        query.select = select;
      }
    }

    return query;
  }
}
