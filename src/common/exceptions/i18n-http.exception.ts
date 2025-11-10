/**
 * I18n 지원 HTTP 예외 클래스
 *
 * I18n 키를 사용하여 다국어 에러 메시지를 자동으로 변환합니다.
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';

/**
 * I18n HTTP 예외 베이스 클래스
 */
export class I18nHttpException extends HttpException {
  constructor(
    private readonly i18nKey: string,
    private readonly args: Record<string, any> = {},
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    // I18n 컨텍스트에서 메시지 변환
    const i18n = I18nContext.current();
    const message = i18n ? (i18n.t(i18nKey, { args }) as string) : i18nKey;

    super(message, status);
  }

  getI18nKey(): string {
    return this.i18nKey;
  }

  getArgs(): Record<string, any> {
    return this.args;
  }
}

/**
 * 400 Bad Request - I18n 지원
 */
export class I18nBadRequestException extends I18nHttpException {
  constructor(i18nKey: string = 'error.http.badRequest', args: Record<string, any> = {}) {
    super(i18nKey, args, HttpStatus.BAD_REQUEST);
  }
}

/**
 * 401 Unauthorized - I18n 지원
 */
export class I18nUnauthorizedException extends I18nHttpException {
  constructor(i18nKey: string = 'error.http.unauthorized', args: Record<string, any> = {}) {
    super(i18nKey, args, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * 403 Forbidden - I18n 지원
 */
export class I18nForbiddenException extends I18nHttpException {
  constructor(i18nKey: string = 'error.http.forbidden', args: Record<string, any> = {}) {
    super(i18nKey, args, HttpStatus.FORBIDDEN);
  }
}

/**
 * 404 Not Found - I18n 지원
 */
export class I18nNotFoundException extends I18nHttpException {
  constructor(i18nKey: string = 'error.http.notFound', args: Record<string, any> = {}) {
    super(i18nKey, args, HttpStatus.NOT_FOUND);
  }
}

/**
 * 409 Conflict - I18n 지원
 */
export class I18nConflictException extends I18nHttpException {
  constructor(i18nKey: string = 'error.http.conflict', args: Record<string, any> = {}) {
    super(i18nKey, args, HttpStatus.CONFLICT);
  }
}

/**
 * 422 Unprocessable Entity - I18n 지원
 */
export class I18nUnprocessableEntityException extends I18nHttpException {
  constructor(
    i18nKey: string = 'error.http.unprocessableEntity',
    args: Record<string, any> = {},
  ) {
    super(i18nKey, args, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

/**
 * 500 Internal Server Error - I18n 지원
 */
export class I18nInternalServerErrorException extends I18nHttpException {
  constructor(
    i18nKey: string = 'error.http.internalServerError',
    args: Record<string, any> = {},
  ) {
    super(i18nKey, args, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
