/**
 * JSON:API 리소스 타입 지정 데코레이터
 * 컨트롤러 메서드에 리소스 타입을 메타데이터로 저장
 */

import { SetMetadata } from '@nestjs/common';

export const JSONAPI_RESOURCE_TYPE = 'jsonapi:resource:type';
export const JSONAPI_INCLUDE_RELATIONSHIPS = 'jsonapi:include:relationships';

/**
 * JSON:API 리소스 타입 지정
 * @param resourceType - 리소스 타입 (예: 'users', 'posts')
 */
export const JsonApiResource = (resourceType: string) =>
  SetMetadata(JSONAPI_RESOURCE_TYPE, resourceType);

/**
 * Relationships 포함 여부 지정
 * @param include - relationships 포함 여부
 */
export const IncludeRelationships = (include: boolean = true) =>
  SetMetadata(JSONAPI_INCLUDE_RELATIONSHIPS, include);
