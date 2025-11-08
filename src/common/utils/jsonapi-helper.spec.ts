/**
 * JSON:API 헬퍼 함수 단위 테스트
 */

import {
  toResourceObject,
  toResourceObjects,
  createPaginationLinks,
  createPaginationMeta,
  parseFields,
  parseSort,
} from './jsonapi-helper';

describe('JsonApiHelper', () => {
  describe('toResourceObject', () => {
    it('should convert entity to ResourceObject', () => {
      const entity = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = toResourceObject('users', entity);

      expect(result).toEqual({
        type: 'users',
        id: '1',
        attributes: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
    });

    it('should apply sparse fieldsets', () => {
      const entity = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const result = toResourceObject('users', entity, {
        fields: ['name', 'email'],
      });

      expect(result.attributes).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(result.attributes).not.toHaveProperty('age');
    });
  });

  describe('toResourceObjects', () => {
    it('should convert array of entities', () => {
      const entities = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ];

      const result = toResourceObjects('users', entities);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });
  });

  describe('createPaginationMeta', () => {
    it('should create pagination meta', () => {
      const result = createPaginationMeta(2, 10, 45);

      expect(result).toEqual({
        currentPage: 2,
        pageSize: 10,
        totalItems: 45,
        totalPages: 5,
      });
    });

    it('should handle edge case with no items', () => {
      const result = createPaginationMeta(1, 10, 0);

      expect(result.totalPages).toBe(0);
    });
  });

  describe('createPaginationLinks', () => {
    it('should create all pagination links', () => {
      const result = createPaginationLinks(
        'http://localhost:3000',
        '/api/users',
        2,
        10,
        45,
      );

      // URL 인코딩된 형태로 검증
      expect(result.self).toContain('page%5Bnumber%5D=2');
      expect(result.first).toContain('page%5Bnumber%5D=1');
      expect(result.last).toContain('page%5Bnumber%5D=5');
      expect(result.prev).toContain('page%5Bnumber%5D=1');
      expect(result.next).toContain('page%5Bnumber%5D=3');
    });

    it('should set prev to null on first page', () => {
      const result = createPaginationLinks(
        'http://localhost:3000',
        '/api/users',
        1,
        10,
        45,
      );

      expect(result.prev).toBeNull();
      expect(result.next).toBeDefined();
    });

    it('should set next to null on last page', () => {
      const result = createPaginationLinks(
        'http://localhost:3000',
        '/api/users',
        5,
        10,
        45,
      );

      expect(result.next).toBeNull();
      expect(result.prev).toBeDefined();
    });
  });

  describe('parseFields', () => {
    it('should parse comma-separated fields', () => {
      const result = parseFields('name,email,age');

      expect(result).toEqual(['name', 'email', 'age']);
    });

    it('should return undefined for empty string', () => {
      const result = parseFields('');

      expect(result).toBeUndefined();
    });

    it('should trim whitespace', () => {
      const result = parseFields('name, email , age');

      expect(result).toEqual(['name', 'email', 'age']);
    });
  });

  describe('parseSort', () => {
    it('should parse ascending sort', () => {
      const result = parseSort('name,createdAt');

      expect(result).toEqual([
        { field: 'name', order: 'ASC' },
        { field: 'createdAt', order: 'ASC' },
      ]);
    });

    it('should parse descending sort with - prefix', () => {
      const result = parseSort('-createdAt,name');

      expect(result).toEqual([
        { field: 'createdAt', order: 'DESC' },
        { field: 'name', order: 'ASC' },
      ]);
    });

    it('should return undefined for empty string', () => {
      const result = parseSort('');

      expect(result).toBeUndefined();
    });
  });
});
