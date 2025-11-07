/**
 * JSON:API 유틸리티 함수
 * 리소스 변환, 링크 생성, 메타 정보 생성 등
 */

import {
  JsonApiDocument,
  ResourceObject,
  ResourceIdentifier,
  Links,
  PaginationLinks,
  PaginationMeta,
  Meta,
} from '../interfaces/jsonapi.interface';

/**
 * 엔티티를 JSON:API ResourceObject로 변환
 */
export function toResourceObject<T>(
  type: string,
  entity: any,
  options?: {
    fields?: string[];
    includeRelationships?: boolean;
  },
): ResourceObject<T> {
  const { id, ...attributes } = entity;

  const resource: ResourceObject<T> = {
    type,
    id: id?.toString(),
  };

  // Sparse Fieldsets 적용
  if (options?.fields && options.fields.length > 0) {
    const filteredAttributes: any = {};
    options.fields.forEach((field) => {
      if (attributes[field] !== undefined) {
        filteredAttributes[field] = attributes[field];
      }
    });
    resource.attributes = filteredAttributes as T;
  } else {
    resource.attributes = attributes as T;
  }

  // TODO: Relationships 처리 (Phase 3에서 구현)
  if (options?.includeRelationships) {
    // relationships 로직은 나중에 추가
  }

  return resource;
}

/**
 * 엔티티 배열을 JSON:API ResourceObject 배열로 변환
 */
export function toResourceObjects<T>(
  type: string,
  entities: any[],
  options?: {
    fields?: string[];
    includeRelationships?: boolean;
  },
): ResourceObject<T>[] {
  return entities.map((entity) => toResourceObject<T>(type, entity, options));
}

/**
 * ResourceIdentifier 생성
 */
export function toResourceIdentifier(
  type: string,
  id: string,
): ResourceIdentifier {
  return { type, id };
}

/**
 * 자기 참조 링크 생성
 */
export function createSelfLink(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`;
}

/**
 * 페이지네이션 링크 생성
 */
export function createPaginationLinks(
  baseUrl: string,
  path: string,
  currentPage: number,
  pageSize: number,
  totalItems: number,
  queryParams?: Record<string, any>,
): PaginationLinks {
  const totalPages = Math.ceil(totalItems / pageSize);

  const buildUrl = (page: number): string => {
    const params = new URLSearchParams({
      ...queryParams,
      'page[number]': page.toString(),
      'page[size]': pageSize.toString(),
    });
    return `${baseUrl}${path}?${params.toString()}`;
  };

  return {
    self: buildUrl(currentPage),
    first: totalPages > 0 ? buildUrl(1) : null,
    last: totalPages > 0 ? buildUrl(totalPages) : null,
    prev: currentPage > 1 ? buildUrl(currentPage - 1) : null,
    next: currentPage < totalPages ? buildUrl(currentPage + 1) : null,
  };
}

/**
 * 페이지네이션 메타 정보 생성
 */
export function createPaginationMeta(
  currentPage: number,
  pageSize: number,
  totalItems: number,
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
  };
}

/**
 * 기본 메타 정보 생성 (타임스탬프, 버전 등)
 */
export function createBaseMeta(): Meta {
  return {
    timestamp: new Date().toISOString(),
    apiVersion: '1.1',
  };
}

/**
 * JSON:API Document 생성 (단일 리소스)
 */
export function createJsonApiDocument<T>(
  data: ResourceObject<T> | null,
  options?: {
    included?: ResourceObject<any>[];
    meta?: Meta;
    links?: Links;
  },
): JsonApiDocument<T> {
  return {
    jsonapi: { version: '1.1' },
    data,
    included: options?.included,
    meta: {
      ...createBaseMeta(),
      ...options?.meta,
    },
    links: options?.links,
  };
}

/**
 * JSON:API Document 생성 (복수 리소스)
 */
export function createJsonApiDocumentArray<T>(
  data: ResourceObject<T>[],
  options?: {
    included?: ResourceObject<any>[];
    meta?: Meta;
    links?: Links;
  },
): JsonApiDocument<T> {
  return {
    jsonapi: { version: '1.1' },
    data,
    included: options?.included,
    meta: {
      ...createBaseMeta(),
      ...options?.meta,
    },
    links: options?.links,
  };
}

/**
 * 쿼리 파라미터에서 필드 추출
 * @example "name,email,age" -> ["name", "email", "age"]
 */
export function parseFields(fieldsParam?: string): string[] | undefined {
  if (!fieldsParam) return undefined;
  return fieldsParam.split(',').map((f) => f.trim());
}

/**
 * 쿼리 파라미터에서 include 추출
 * @example "posts,comments.author" -> ["posts", "comments.author"]
 */
export function parseInclude(includeParam?: string): string[] | undefined {
  if (!includeParam) return undefined;
  return includeParam.split(',').map((i) => i.trim());
}

/**
 * 쿼리 파라미터에서 sort 추출
 * @example "-createdAt,name" -> [{ field: "createdAt", order: "DESC" }, { field: "name", order: "ASC" }]
 */
export function parseSort(
  sortParam?: string,
): Array<{ field: string; order: 'ASC' | 'DESC' }> | undefined {
  if (!sortParam) return undefined;

  return sortParam.split(',').map((s) => {
    const trimmed = s.trim();
    if (trimmed.startsWith('-')) {
      return { field: trimmed.substring(1), order: 'DESC' as const };
    }
    return { field: trimmed, order: 'ASC' as const };
  });
}
