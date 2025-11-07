/**
 * JSON:API Validation Pipe 단위 테스트
 */

import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { JsonApiValidationPipe } from './jsonapi-validation.pipe';

describe('JsonApiValidationPipe', () => {
  let pipe: JsonApiValidationPipe;

  beforeEach(() => {
    pipe = new JsonApiValidationPipe();
  });

  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: Object,
  };

  it('should pass through non-body parameters', () => {
    const queryMetadata: ArgumentMetadata = {
      type: 'query',
      metatype: Object,
    };

    const value = { test: 'value' };
    const result = pipe.transform(value, queryMetadata);

    expect(result).toEqual(value);
  });

  it('should validate JSON:API request format', () => {
    const validRequest = {
      data: {
        type: 'users',
        attributes: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
    };

    const result = pipe.transform(validRequest, metadata);

    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('should throw error if data property is missing', () => {
    const invalidRequest = {
      attributes: { name: 'John' },
    };

    expect(() => pipe.transform(invalidRequest, metadata)).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform(invalidRequest, metadata)).toThrow(
      'Request body must contain "data" property',
    );
  });

  it('should throw error if type is missing', () => {
    const invalidRequest = {
      data: {
        attributes: { name: 'John' },
      },
    };

    expect(() => pipe.transform(invalidRequest, metadata)).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform(invalidRequest, metadata)).toThrow(
      'Resource object must have a "type" property',
    );
  });

  it('should validate expected resource type', () => {
    const pipeWithType = new JsonApiValidationPipe({ expectedType: 'users' });

    const validRequest = {
      data: {
        type: 'users',
        attributes: { name: 'John' },
      },
    };

    expect(() => pipeWithType.transform(validRequest, metadata)).not.toThrow();

    const invalidRequest = {
      data: {
        type: 'posts',
        attributes: { title: 'Test' },
      },
    };

    expect(() => pipeWithType.transform(invalidRequest, metadata)).toThrow(
      'Expected resource type "users", but got "posts"',
    );
  });

  it('should require ID when configured', () => {
    const pipeWithIdRequired = new JsonApiValidationPipe({ requireId: true });

    const invalidRequest = {
      data: {
        type: 'users',
        attributes: { name: 'John' },
      },
    };

    expect(() => pipeWithIdRequired.transform(invalidRequest, metadata)).toThrow(
      'Resource object must have an "id" property',
    );

    const validRequest = {
      data: {
        type: 'users',
        id: '1',
        attributes: { name: 'John' },
      },
    };

    expect(() => pipeWithIdRequired.transform(validRequest, metadata)).not.toThrow();
  });

  it('should extract attributes from valid request', () => {
    const request = {
      data: {
        type: 'users',
        attributes: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        },
      },
    };

    const result = pipe.transform(request, metadata);

    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    });
  });

  it('should handle empty attributes', () => {
    const request = {
      data: {
        type: 'users',
      },
    };

    const result = pipe.transform(request, metadata);

    expect(result).toEqual({});
  });
});
