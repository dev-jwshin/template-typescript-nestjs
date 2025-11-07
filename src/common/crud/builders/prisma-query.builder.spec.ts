import { PrismaQueryBuilder } from './prisma-query.builder';
import { FilterOperator } from '../types/filter-operator.type';

describe('PrismaQueryBuilder', () => {
  let builder: PrismaQueryBuilder;

  beforeEach(() => {
    builder = new PrismaQueryBuilder();
  });

  describe('buildWhereClause', () => {
    it('eq 연산자 - 정확한 일치', () => {
      const result = builder.buildWhereClause(
        { name: ['eq'] },
        { name: { eq: 'John' } }
      );

      expect(result).toEqual({ name: { equals: 'John' } });
    });

    it('ne 연산자 - 일치하지 않음', () => {
      const result = builder.buildWhereClause(
        { name: ['ne'] },
        { name: { ne: 'Admin' } }
      );

      expect(result).toEqual({ name: { not: 'Admin' } });
    });

    it('gt, gte, lt, lte 연산자 - 숫자 비교', () => {
      const result = builder.buildWhereClause(
        { age: ['gte', 'lte'] },
        { age: { gte: 18, lte: 65 } }
      );

      expect(result).toEqual({ age: { gte: 18, lte: 65 } });
    });

    it('like 연산자 - 패턴 매칭 (대소문자 구분)', () => {
      const result = builder.buildWhereClause(
        { name: ['like'] },
        { name: { like: 'John' } }
      );

      expect(result).toEqual({ name: { contains: 'John' } });
    });

    it('ilike 연산자 - 패턴 매칭 (대소문자 무시)', () => {
      const result = builder.buildWhereClause(
        { name: ['ilike'] },
        { name: { ilike: 'john' } }
      );

      expect(result).toEqual({ name: { contains: 'john', mode: 'insensitive' } });
    });

    it('in 연산자 - 배열 포함', () => {
      const result = builder.buildWhereClause(
        { name: ['in'] },
        { name: { in: 'John,Jane,Bob' } }
      );

      expect(result).toEqual({ name: { in: ['John', 'Jane', 'Bob'] } });
    });

    it('nin 연산자 - 배열 미포함', () => {
      const result = builder.buildWhereClause(
        { status: ['nin'] },
        { status: { nin: 'deleted,archived' } }
      );

      expect(result).toEqual({ status: { notIn: ['deleted', 'archived'] } });
    });

    it('between 연산자 - 범위', () => {
      const result = builder.buildWhereClause(
        { age: ['between'] },
        { age: { between: '18,65' } }
      );

      expect(result).toEqual({ age: { gte: 18, lte: 65 } });
    });

    it('isNull 연산자 - NULL 체크', () => {
      const result = builder.buildWhereClause(
        { deletedAt: ['isNull'] },
        { deletedAt: { isNull: 'true' } }
      );

      expect(result).toEqual({ deletedAt: null });
    });

    it('isNotNull 연산자 - NOT NULL 체크', () => {
      const result = builder.buildWhereClause(
        { deletedAt: ['isNotNull'] },
        { deletedAt: { isNotNull: 'true' } }
      );

      expect(result).toEqual({ deletedAt: { not: null } });
    });

    it('허용되지 않은 필터는 무시', () => {
      const result = builder.buildWhereClause(
        { name: ['eq'] },
        { name: { eq: 'John' }, invalidField: { eq: 'test' } }
      );

      expect(result).toEqual({ name: { equals: 'John' } });
      expect(result).not.toHaveProperty('invalidField');
    });

    it('허용되지 않은 연산자는 무시', () => {
      const result = builder.buildWhereClause(
        { name: ['eq'] },
        { name: { eq: 'John', like: 'test' } }
      );

      expect(result).toEqual({ name: { equals: 'John' } });
    });
  });

  describe('buildOrderByClause', () => {
    it('단일 필드 오름차순 정렬', () => {
      const result = builder.buildOrderByClause([{ field: 'createdAt', order: 'ASC' }]);

      expect(result).toEqual([{ createdAt: 'asc' }]);
    });

    it('단일 필드 내림차순 정렬', () => {
      const result = builder.buildOrderByClause([{ field: 'createdAt', order: 'DESC' }]);

      expect(result).toEqual([{ createdAt: 'desc' }]);
    });

    it('다중 필드 정렬', () => {
      const result = builder.buildOrderByClause([
        { field: 'name', order: 'ASC' },
        { field: 'createdAt', order: 'DESC' },
      ]);

      expect(result).toEqual([
        { name: 'asc' },
        { createdAt: 'desc' },
      ]);
    });

    it('정렬 조건 없음', () => {
      const result = builder.buildOrderByClause(undefined);

      expect(result).toBeUndefined();
    });
  });

  describe('buildIncludeClause - N+1 쿼리 최적화', () => {
    it('단일 관계 include', () => {
      const result = builder.buildIncludeClause(['profile']);

      expect(result).toEqual({ profile: true });
    });

    it('중첩 관계 include (N+1 최적화)', () => {
      const result = builder.buildIncludeClause(['profile.attachments']);

      expect(result).toEqual({
        profile: {
          include: {
            attachments: true,
          },
        },
      });
    });

    it('다중 관계 include', () => {
      const result = builder.buildIncludeClause(['profile', 'roles']);

      expect(result).toEqual({
        profile: true,
        roles: true,
      });
    });

    it('다중 중첩 관계 include', () => {
      const result = builder.buildIncludeClause([
        'profile.attachments',
        'profile.settings',
        'roles',
      ]);

      expect(result).toEqual({
        profile: {
          include: {
            attachments: true,
            settings: true,
          },
        },
        roles: true,
      });
    });

    it('3단계 중첩 관계 include', () => {
      const result = builder.buildIncludeClause(['profile.attachments.files']);

      expect(result).toEqual({
        profile: {
          include: {
            attachments: {
              include: {
                files: true,
              },
            },
          },
        },
      });
    });
  });

  describe('buildPaginationClause', () => {
    it('페이지네이션 설정', () => {
      const result = builder.buildPaginationClause({ number: 1, size: 10 });

      expect(result).toEqual({ skip: 0, take: 10 });
    });

    it('2페이지 페이지네이션', () => {
      const result = builder.buildPaginationClause({ number: 2, size: 10 });

      expect(result).toEqual({ skip: 10, take: 10 });
    });

    it('페이지네이션 없음', () => {
      const result = builder.buildPaginationClause(undefined);

      expect(result).toEqual({});
    });
  });

  describe('buildQuery - 통합 쿼리 빌드', () => {
    it('N+1 최적화 활성화 시 자동 include 생성', () => {
      const result = builder.buildQuery({
        allowedIncludes: ['profile', 'roles'],
        eagerLoad: true,
      });

      expect(result).toHaveProperty('include');
      expect(result.include).toEqual({
        profile: true,
        roles: true,
      });
    });

    it('N+1 최적화 비활성화 시 include 생성 안함', () => {
      const result = builder.buildQuery({
        allowedIncludes: ['profile', 'roles'],
        eagerLoad: false,
      });

      expect(result).not.toHaveProperty('include');
    });

    it('필터 + 정렬 + 페이지네이션 통합', () => {
      const result = builder.buildQuery({
        filterValues: { name: { eq: 'John' } },
        allowedFilters: { name: ['eq'] },
        sort: [{ field: 'createdAt', order: 'DESC' }],
        page: { number: 1, size: 10 },
      });

      expect(result).toEqual({
        where: { name: { equals: 'John' } },
        orderBy: [{ createdAt: 'desc' }],
        skip: 0,
        take: 10,
      });
    });
  });
});
