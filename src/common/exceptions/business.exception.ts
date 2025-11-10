/**
 * 비즈니스 로직 예외 클래스
 *
 * 도메인별 비즈니스 에러를 I18n 키로 관리합니다.
 */

import { HttpStatus } from '@nestjs/common';
import {
  I18nHttpException,
  I18nNotFoundException,
  I18nConflictException,
  I18nBadRequestException,
  I18nForbiddenException,
} from './i18n-http.exception';

/**
 * 사용자 관련 예외
 */
export class UserNotFoundException extends I18nNotFoundException {
  constructor(userId?: string) {
    super('error.business.userNotFound', userId ? { userId } : {});
  }
}

export class UserAlreadyExistsException extends I18nConflictException {
  constructor(email?: string) {
    super('error.business.userAlreadyExists', email ? { email } : {});
  }
}

export class EmailAlreadyExistsException extends I18nConflictException {
  constructor(email: string) {
    super('error.business.emailAlreadyExists', { email });
  }
}

export class InvalidCredentialsException extends I18nBadRequestException {
  constructor() {
    super('error.business.invalidCredentials');
  }
}

export class AccountLockedException extends I18nForbiddenException {
  constructor() {
    super('error.business.accountLocked');
  }
}

export class AccountDisabledException extends I18nForbiddenException {
  constructor() {
    super('error.business.accountDisabled');
  }
}

/**
 * 토큰 관련 예외
 */
export class TokenExpiredException extends I18nBadRequestException {
  constructor() {
    super('error.business.tokenExpired');
  }
}

export class TokenInvalidException extends I18nBadRequestException {
  constructor() {
    super('error.business.tokenInvalid');
  }
}

/**
 * 리소스 관련 예외
 */
export class ResourceNotFoundException extends I18nNotFoundException {
  constructor(resourceType: string, resourceId?: string) {
    super('error.business.resourceNotFound', {
      resource: resourceType,
      id: resourceId || 'unknown',
    });
  }
}

export class ResourceAlreadyExistsException extends I18nConflictException {
  constructor(resourceType: string, resourceId?: string) {
    super('error.business.resourceAlreadyExists', {
      resource: resourceType,
      id: resourceId || 'unknown',
    });
  }
}

/**
 * 권한 관련 예외
 */
export class InsufficientPermissionsException extends I18nForbiddenException {
  constructor() {
    super('error.business.insufficientPermissions');
  }
}

export class OperationNotAllowedException extends I18nForbiddenException {
  constructor(operation?: string) {
    super('error.business.operationNotAllowed', operation ? { operation } : {});
  }
}

/**
 * 데이터 관련 예외
 */
export class DataConflictException extends I18nConflictException {
  constructor(details?: string) {
    super('error.business.dataConflict', details ? { details } : {});
  }
}

export class InvalidOperationException extends I18nBadRequestException {
  constructor(operation?: string) {
    super('error.business.invalidOperation', operation ? { operation } : {});
  }
}

/**
 * 할당량 관련 예외
 */
export class QuotaExceededException extends I18nHttpException {
  constructor(quotaType?: string, limit?: number) {
    super(
      'error.business.quotaExceeded',
      { quotaType, limit },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * 파일 관련 예외
 */
export class FileNotFoundException extends I18nNotFoundException {
  constructor(filename?: string) {
    super('error.business.fileNotFound', filename ? { filename } : {});
  }
}

export class FileTooLargeException extends I18nBadRequestException {
  constructor(maxSize?: number) {
    super('error.business.fileTooLarge', maxSize ? { maxSize } : {});
  }
}

export class InvalidFileTypeException extends I18nBadRequestException {
  constructor(allowedTypes?: string[]) {
    super('error.business.invalidFileType', allowedTypes ? { allowedTypes } : {});
  }
}

/**
 * 시스템 관련 예외
 */
export class DatabaseErrorException extends I18nHttpException {
  constructor(details?: string) {
    super(
      'error.business.databaseError',
      details ? { details } : {},
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class NetworkErrorException extends I18nHttpException {
  constructor(details?: string) {
    super(
      'error.business.networkError',
      details ? { details } : {},
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class TimeoutErrorException extends I18nHttpException {
  constructor(timeout?: number) {
    super('error.business.timeoutError', timeout ? { timeout } : {}, HttpStatus.GATEWAY_TIMEOUT);
  }
}
