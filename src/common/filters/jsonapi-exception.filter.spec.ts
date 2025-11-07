/**
 * JSON:API Exception Filter 단위 테스트
 */

import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { JsonApiExceptionFilter } from './jsonapi-exception.filter';

describe('JsonApiExceptionFilter', () => {
  let filter: JsonApiExceptionFilter;
  let mockResponse: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new JsonApiExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should transform HttpException to JSON:API error format', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonapi: { version: '1.1' },
        errors: expect.arrayContaining([
          expect.objectContaining({
            status: '404',
            code: 'NOT_FOUND',
            title: 'Not Found',
            detail: 'Not Found',
          }),
        ]),
      }),
    );
  });

  it('should handle validation errors', () => {
    const exception = new HttpException(
      {
        message: ['email must be valid', 'password is too short'],
        error: 'Bad Request',
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            status: '422',
            code: 'VALIDATION_ERROR',
          }),
        ]),
      }),
    );
  });

  it('should include error ID in response', () => {
    const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    const call = mockResponse.json.mock.calls[0][0];
    expect(call.errors[0]).toHaveProperty('id');
    expect(call.errors[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('should include timestamp in error response', () => {
    const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    const call = mockResponse.json.mock.calls[0][0];
    expect(call.meta).toHaveProperty('timestamp');
    expect(call.errors[0].meta).toHaveProperty('timestamp');
  });

  it('should handle unknown errors', () => {
    const exception = new Error('Unknown error');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            status: '500',
            code: 'INTERNAL_SERVER_ERROR',
            detail: 'Unknown error',
          }),
        ]),
      }),
    );
  });

  it('should map HTTP status codes to error codes correctly', () => {
    const testCases = [
      { status: HttpStatus.BAD_REQUEST, code: 'BAD_REQUEST' },
      { status: HttpStatus.UNAUTHORIZED, code: 'UNAUTHORIZED' },
      { status: HttpStatus.FORBIDDEN, code: 'FORBIDDEN' },
      { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND' },
      { status: HttpStatus.CONFLICT, code: 'CONFLICT' },
      { status: HttpStatus.UNPROCESSABLE_ENTITY, code: 'VALIDATION_ERROR' },
    ];

    testCases.forEach(({ status, code }) => {
      const exception = new HttpException('Test', status);
      filter.catch(exception, mockHost);

      const call = mockResponse.json.mock.calls[mockResponse.json.mock.calls.length - 1][0];
      expect(call.errors[0].code).toBe(code);
    });
  });
});
