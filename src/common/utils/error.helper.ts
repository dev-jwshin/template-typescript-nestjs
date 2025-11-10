/**
 * 에러 처리 헬퍼 유틸리티
 *
 * I18n 키 기반 에러 생성 및 변환을 위한 유틸리티 함수
 */

import { HttpStatus } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import {
  I18nHttpException,
  I18nBadRequestException,
  I18nNotFoundException,
  I18nConflictException,
  I18nForbiddenException,
  I18nUnauthorizedException,
} from '../exceptions';

/**
 * I18n 키로 HTTP 예외 생성
 *
 * @param i18nKey 번역 키 (예: 'error.business.userNotFound')
 * @param args 번역 파라미터
 * @param status HTTP 상태 코드
 * @returns I18nHttpException
 */
export function createI18nException(
  i18nKey: string,
  args: Record<string, any> = {},
  status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
): I18nHttpException {
  return new I18nHttpException(i18nKey, args, status);
}

/**
 * HTTP 상태 코드에 따른 예외 생성
 *
 * @param status HTTP 상태 코드
 * @param i18nKey 번역 키 (선택사항)
 * @param args 번역 파라미터
 * @returns I18nHttpException 또는 하위 클래스
 */
export function createExceptionByStatus(
  status: HttpStatus,
  i18nKey?: string,
  args: Record<string, any> = {},
): I18nHttpException {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return new I18nBadRequestException(i18nKey, args);
    case HttpStatus.UNAUTHORIZED:
      return new I18nUnauthorizedException(i18nKey, args);
    case HttpStatus.FORBIDDEN:
      return new I18nForbiddenException(i18nKey, args);
    case HttpStatus.NOT_FOUND:
      return new I18nNotFoundException(i18nKey, args);
    case HttpStatus.CONFLICT:
      return new I18nConflictException(i18nKey, args);
    default:
      return new I18nHttpException(
        i18nKey || 'error.http.internalServerError',
        args,
        status,
      );
  }
}

/**
 * I18n 컨텍스트에서 에러 메시지 번역
 *
 * @param i18nKey 번역 키
 * @param args 번역 파라미터
 * @param fallback Fallback 메시지 (I18n 실패 시)
 * @returns 번역된 메시지
 */
export function translateError(
  i18nKey: string,
  args: Record<string, any> = {},
  fallback?: string,
): string {
  const i18n = I18nContext.current();

  if (!i18n) {
    return fallback || i18nKey;
  }

  const translated = i18n.t(i18nKey, { args });

  // 번역 실패 시 fallback 사용
  if (!translated || translated === i18nKey) {
    return fallback || i18nKey;
  }

  return translated as string;
}

/**
 * 에러 객체를 JSON:API 에러 형식으로 변환
 *
 * @param error Error 객체
 * @param i18nKey 번역 키 (선택사항)
 * @param args 번역 파라미터
 * @returns JSON:API 에러 객체
 */
export function toJsonApiError(
  error: Error,
  i18nKey?: string,
  args: Record<string, any> = {},
): {
  status: string;
  code: string;
  title: string;
  detail: string;
} {
  const i18n = I18nContext.current();

  return {
    status: '500',
    code: 'INTERNAL_SERVER_ERROR',
    title: i18n?.t('error.http.internalServerError') || 'Internal Server Error',
    detail: i18nKey ? translateError(i18nKey, args, error.message) : error.message,
  };
}

/**
 * Validation 에러 메시지 포맷팅
 *
 * @param field 필드명
 * @param constraint 제약 조건 (예: 'required', 'invalid')
 * @param args 추가 파라미터
 * @returns 번역된 에러 메시지
 */
export function formatValidationError(
  field: string,
  constraint: string,
  args: Record<string, any> = {},
): string {
  const i18nKey = `error.validation.${constraint}`;
  return translateError(i18nKey, { field, ...args }, `${field} ${constraint}`);
}

/**
 * 여러 에러를 병합하여 하나의 메시지로 생성
 *
 * @param errors 에러 배열
 * @param separator 구분자 (기본값: '; ')
 * @returns 병합된 에러 메시지
 */
export function mergeErrorMessages(errors: Error[], separator: string = '; '): string {
  return errors.map((error) => error.message).join(separator);
}

/**
 * 에러 타입 확인 유틸리티
 */
export const isI18nException = (error: any): error is I18nHttpException => {
  return error instanceof I18nHttpException;
};

export const isValidationError = (error: any): boolean => {
  return (
    error.response &&
    error.response.statusCode === 400 &&
    Array.isArray(error.response.message)
  );
};

/**
 * 에러 로깅 헬퍼
 *
 * @param error Error 객체
 * @param context 컨텍스트 정보
 */
export function logError(error: Error, context?: string): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}]` : '';

  console.error(`${timestamp} ${contextStr} ${error.name}: ${error.message}`);

  if (error.stack) {
    console.error(error.stack);
  }
}
