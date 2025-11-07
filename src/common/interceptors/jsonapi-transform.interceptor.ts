/**
 * JSON:API 응답 변환 인터셉터
 * 컨트롤러의 응답을 JSON:API 1.1 스펙에 맞게 변환
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import {
  JSONAPI_RESOURCE_TYPE,
  JSONAPI_INCLUDE_RELATIONSHIPS,
} from '../decorators/jsonapi-resource.decorator';
import {
  JsonApiDocument,
  ResourceObject,
  PaginationLinks,
} from '../interfaces/jsonapi.interface';
import {
  toResourceObject,
  toResourceObjects,
  createJsonApiDocument,
  createJsonApiDocumentArray,
  createPaginationLinks,
  createPaginationMeta,
  parseFields,
} from '../utils/jsonapi-helper';

@Injectable()
export class JsonApiTransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    // 메타데이터에서 리소스 타입 가져오기
    const resourceType = this.reflector.get<string>(
      JSONAPI_RESOURCE_TYPE,
      handler,
    );

    // 리소스 타입이 지정되지 않은 경우 원본 응답 반환
    if (!resourceType) {
      return next.handle();
    }

    const includeRelationships =
      this.reflector.get<boolean>(JSONAPI_INCLUDE_RELATIONSHIPS, handler) ||
      false;

    return next.handle().pipe(
      map((data) => {
        // null 또는 undefined 처리
        if (data === null || data === undefined) {
          return createJsonApiDocument(null);
        }

        // 이미 JSON:API 형식인 경우 그대로 반환
        if (this.isJsonApiDocument(data)) {
          return data;
        }

        // Sparse Fieldsets 파싱
        const fieldsParam = request.query[`fields[${resourceType}]`] as string;
        const fields = parseFields(fieldsParam);

        // 페이지네이션 정보 추출 (메타데이터 또는 응답에 포함된 경우)
        const isPaginated = data.items && data.meta;

        if (isPaginated) {
          // 페이지네이션된 응답 처리
          return this.transformPaginatedResponse(
            resourceType,
            data,
            request,
            fields,
            includeRelationships,
          );
        }

        // 배열 응답 처리
        if (Array.isArray(data)) {
          const resources = toResourceObjects(resourceType, data, {
            fields,
            includeRelationships,
          });
          return createJsonApiDocumentArray(resources);
        }

        // 단일 객체 응답 처리
        const resource = toResourceObject(resourceType, data, {
          fields,
          includeRelationships,
        });
        return createJsonApiDocument(resource);
      }),
    );
  }

  /**
   * 페이지네이션된 응답 변환
   */
  private transformPaginatedResponse(
    resourceType: string,
    data: any,
    request: Request,
    fields?: string[],
    includeRelationships?: boolean,
  ): JsonApiDocument {
    const { items, meta } = data;
    const { currentPage, pageSize, totalItems } = meta;

    // 리소스 배열 생성
    const resources = toResourceObjects(resourceType, items, {
      fields,
      includeRelationships,
    });

    // 페이지네이션 링크 생성
    const baseUrl = `${request.protocol}://${request.get('host')}`;
    const path = request.path;

    // 쿼리 파라미터 추출 (page 제외)
    const queryParams: Record<string, any> = {};
    Object.keys(request.query).forEach((key) => {
      if (!key.startsWith('page[')) {
        queryParams[key] = request.query[key];
      }
    });

    const links = createPaginationLinks(
      baseUrl,
      path,
      currentPage,
      pageSize,
      totalItems,
      queryParams,
    );

    // 페이지네이션 메타 정보 생성
    const paginationMeta = createPaginationMeta(
      currentPage,
      pageSize,
      totalItems,
    );

    return createJsonApiDocumentArray(resources, {
      meta: paginationMeta,
      links,
    });
  }

  /**
   * 데이터가 이미 JSON:API 형식인지 확인
   */
  private isJsonApiDocument(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      ('data' in data || 'errors' in data) &&
      'jsonapi' in data
    );
  }
}
