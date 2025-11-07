import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * HTTP 예외 필터
 * - 모든 HTTP 예외를 일관된 형식으로 변환
 * - 에러 로깅 및 모니터링
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'Internal server error',
    };

    // 프로덕션 환경이 아닌 경우 스택 트레이스 포함
    if (process.env.NODE_ENV !== 'production') {
      (errorResponse as any).stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}
