/**
 * JSON:API 에러 필터
 * 모든 예외를 JSON:API 1.1 에러 형식으로 변환
 * I18n 다국어 지원
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { I18nContext } from 'nestjs-i18n';
import { JsonApiDocument, JsonApiError } from '../interfaces/jsonapi.interface';

/**
 * JSON:API 에러 코드 매핑
 */
const ERROR_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

@Catch()
export class JsonApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // I18n 컨텍스트 가져오기
    const i18n = I18nContext.current();

    let status: number;
    let errors: JsonApiError[];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errors = this.parseHttpException(exception, i18n);
    } else {
      // 알 수 없는 에러
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errors = [
        {
          id: uuidv4(),
          status: status.toString(),
          code: 'INTERNAL_SERVER_ERROR',
          title: i18n?.t('error.http.internalServerError') || 'Internal Server Error',
          detail:
            exception instanceof Error
              ? exception.message
              : i18n?.t('error.http.unexpectedError') || 'An unexpected error occurred',
          meta: {
            timestamp: new Date().toISOString(),
          },
        },
      ];
    }

    const errorResponse: JsonApiDocument = {
      jsonapi: { version: '1.1' },
      errors,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    response.status(status).json(errorResponse);
  }

  /**
   * HttpException을 JSON:API 에러 배열로 변환
   */
  private parseHttpException(
    exception: HttpException,
    i18n: I18nContext | undefined,
  ): JsonApiError[] {
    const status = exception.getStatus();
    const response = exception.getResponse();

    // 응답이 객체인 경우 (NestJS 기본 에러 또는 커스텀 에러)
    if (typeof response === 'object' && response !== null) {
      return this.parseErrorResponse(status, response as any, i18n);
    }

    // 응답이 문자열인 경우
    return [
      {
        id: uuidv4(),
        status: status.toString(),
        code: ERROR_CODE_MAP[status] || 'UNKNOWN_ERROR',
        title: this.getDefaultErrorTitle(status, i18n),
        detail: typeof response === 'string' ? response : exception.message,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
    ];
  }

  /**
   * 에러 응답 객체 파싱 (NestJS ValidationPipe 에러 등)
   */
  private parseErrorResponse(
    status: number,
    response: any,
    i18n: I18nContext | undefined,
  ): JsonApiError[] {
    const baseError = {
      id: uuidv4(),
      status: status.toString(),
      code: ERROR_CODE_MAP[status] || 'UNKNOWN_ERROR',
      title: response.error || this.getDefaultErrorTitle(status, i18n),
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    // ValidationPipe 에러 (message가 배열인 경우)
    if (Array.isArray(response.message)) {
      return response.message.map((msg: string) => ({
        ...baseError,
        id: uuidv4(),
        detail: msg,
        source: this.extractSourceFromMessage(msg),
      }));
    }

    // 단일 에러 메시지
    return [
      {
        ...baseError,
        detail:
          response.message ||
          response.error ||
          i18n?.t('error.http.unexpectedError') ||
          'An error occurred',
      },
    ];
  }

  /**
   * 에러 메시지에서 source.pointer 추출 시도
   * @example "email must be a valid email" -> { pointer: "/data/attributes/email" }
   */
  private extractSourceFromMessage(message: string): { pointer: string } | undefined {
    // 간단한 패턴 매칭 (필드명이 메시지 앞에 있는 경우)
    const fieldMatch = message.match(/^(\w+)\s+/);
    if (fieldMatch && fieldMatch[1]) {
      return {
        pointer: `/data/attributes/${fieldMatch[1]}`,
      };
    }
    return undefined;
  }

  /**
   * HTTP 상태 코드에 따른 기본 에러 제목 (I18n 지원)
   */
  private getDefaultErrorTitle(status: number, i18n: I18nContext | undefined): string {
    // I18n 키 매핑
    const i18nKeys: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'error.http.badRequest',
      [HttpStatus.UNAUTHORIZED]: 'error.http.unauthorized',
      [HttpStatus.FORBIDDEN]: 'error.http.forbidden',
      [HttpStatus.NOT_FOUND]: 'error.http.notFound',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'error.http.methodNotAllowed',
      [HttpStatus.CONFLICT]: 'error.http.conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'error.http.unprocessableEntity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'error.http.tooManyRequests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'error.http.internalServerError',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'error.http.serviceUnavailable',
    };

    // I18n 번역 시도
    if (i18n && i18nKeys[status]) {
      const translated = i18n.t(i18nKeys[status]);
      if (translated && translated !== i18nKeys[status]) {
        return translated as string;
      }
    }

    // Fallback: 영어 기본 메시지
    const fallbackTitles: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'Method Not Allowed',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
    };

    return fallbackTitles[status] || 'Error';
  }
}
