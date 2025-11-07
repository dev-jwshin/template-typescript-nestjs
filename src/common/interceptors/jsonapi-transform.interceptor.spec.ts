/**
 * JSON:API Transform Interceptor 단위 테스트
 */

import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { JsonApiTransformInterceptor } from './jsonapi-transform.interceptor';
import { JSONAPI_RESOURCE_TYPE } from '../decorators/jsonapi-resource.decorator';

describe('JsonApiTransformInterceptor', () => {
  let interceptor: JsonApiTransformInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new JsonApiTransformInterceptor(reflector);
  });

  const createMockExecutionContext = (resourceType?: string): ExecutionContext => {
    const mockRequest = {
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:3000'),
      path: '/api/users',
      query: {},
    };

    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn(),
    } as unknown as ExecutionContext;

    if (resourceType) {
      jest.spyOn(reflector, 'get').mockReturnValue(resourceType);
    }

    return mockContext;
  };

  const createMockCallHandler = (data: any): CallHandler => {
    return {
      handle: jest.fn().mockReturnValue(of(data)),
    } as unknown as CallHandler;
  };

  it('should transform single entity to JSON:API format', (done) => {
    const mockContext = createMockExecutionContext('users');
    const mockData = { id: '1', name: 'John Doe', email: 'john@example.com' };
    const mockHandler = createMockCallHandler(mockData);

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result.jsonapi).toEqual({ version: '1.1' });
      expect(result.data.type).toBe('users');
      expect(result.data.id).toBe('1');
      expect(result.data.attributes).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
      done();
    });
  });

  it('should transform array of entities', (done) => {
    const mockContext = createMockExecutionContext('users');
    const mockData = [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ];
    const mockHandler = createMockCallHandler(mockData);

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('1');
      expect(result.data[1].id).toBe('2');
      done();
    });
  });

  it('should handle null data', (done) => {
    const mockContext = createMockExecutionContext('users');
    const mockHandler = createMockCallHandler(null);

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result.data).toBeNull();
      expect(result.jsonapi).toEqual({ version: '1.1' });
      done();
    });
  });

  it('should return original response when no resource type', (done) => {
    const mockContext = createMockExecutionContext();
    const mockData = { id: '1', name: 'John' };
    const mockHandler = createMockCallHandler(mockData);

    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toEqual(mockData);
      done();
    });
  });

  it('should handle paginated response', (done) => {
    const mockContext = createMockExecutionContext('users');
    const mockData = {
      items: [{ id: '1', name: 'John' }],
      meta: {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
      },
    };
    const mockHandler = createMockCallHandler(mockData);

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result.data).toHaveLength(1);
      expect(result.meta.currentPage).toBe(1);
      expect(result.links).toBeDefined();
      expect(result.links.self).toContain('page[number]=1');
      done();
    });
  });

  it('should pass through already formatted JSON:API response', (done) => {
    const mockContext = createMockExecutionContext('users');
    const mockData = {
      jsonapi: { version: '1.1' },
      data: { type: 'users', id: '1', attributes: { name: 'John' } },
    };
    const mockHandler = createMockCallHandler(mockData);

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toEqual(mockData);
      done();
    });
  });
});
