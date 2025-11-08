/**
 * JSON:API Transform Middleware 단위 테스트
 */

import { JsonApiTransformMiddleware } from './jsonapi-transform.middleware';
import { Request, Response, NextFunction } from 'express';

describe('JsonApiTransformMiddleware', () => {
  let middleware: JsonApiTransformMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new JsonApiTransformMiddleware();
    mockRequest = {
      method: 'POST',
      body: {},
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  describe('POST 요청', () => {
    it('should transform JSON:API format to plain object', () => {
      mockRequest.body = {
        data: {
          type: 'users',
          attributes: {
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
          },
        },
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });
      expect((mockRequest as any).jsonApiOriginal).toBeDefined();
      expect((mockRequest as any).jsonApiOriginal.data.type).toBe('users');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should pass through non-JSON:API requests', () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const originalBody = { ...mockRequest.body };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.body).toEqual(originalBody);
      expect((mockRequest as any).jsonApiOriginal).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle empty attributes', () => {
      mockRequest.body = {
        data: {
          type: 'users',
          attributes: {},
        },
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.body).toEqual({});
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle missing attributes', () => {
      mockRequest.body = {
        data: {
          type: 'users',
        },
      };

      const originalBody = { ...mockRequest.body };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      // attributes가 없으면 body가 변경되지 않음
      expect(mockRequest.body).toEqual(originalBody);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('PATCH 요청', () => {
    it('should transform JSON:API format for PATCH', () => {
      mockRequest.method = 'PATCH';
      mockRequest.body = {
        data: {
          type: 'users',
          id: '1',
          attributes: {
            name: 'Updated Name',
          },
        },
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.body).toEqual({
        name: 'Updated Name',
      });
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('GET 요청', () => {
    it('should not transform GET requests', () => {
      mockRequest.method = 'GET';
      mockRequest.body = {
        data: {
          type: 'users',
          attributes: { name: 'John' },
        },
      };

      const originalBody = { ...mockRequest.body };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.body).toEqual(originalBody);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('DELETE 요청', () => {
    it('should not transform DELETE requests', () => {
      mockRequest.method = 'DELETE';
      mockRequest.body = {
        data: {
          type: 'users',
          attributes: { name: 'John' },
        },
      };

      const originalBody = { ...mockRequest.body };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.body).toEqual(originalBody);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null body', () => {
      mockRequest.body = null;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.body).toBeNull();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle undefined body', () => {
      mockRequest.body = undefined;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.body).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
