/**
 * JSON:API 쿼리 파라미터 데코레이터
 * Sparse Fieldsets, Filtering, Sorting, Pagination 지원
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { parseFields, parseInclude, parseSort } from '../utils/jsonapi-helper';

/**
 * Sparse Fieldsets 파라미터 추출
 * @example @SparseFields('users') fields: string[]
 */
export const SparseFields = createParamDecorator(
  (resourceType: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const fieldsParam = request.query[`fields[${resourceType}]`] as string;
    return parseFields(fieldsParam);
  },
);

/**
 * Include 파라미터 추출
 * @example @Include() include: string[]
 */
export const Include = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const includeParam = request.query.include as string;
    return parseInclude(includeParam);
  },
);

/**
 * Filter 파라미터 추출
 * @example @Filter() filter: Record<string, any>
 */
export const Filter = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const filter: Record<string, any> = {};

    // filter[key]=value 형식의 쿼리 파라미터 추출
    Object.keys(request.query).forEach((key) => {
      if (key.startsWith('filter[') && key.endsWith(']')) {
        const filterKey = key.substring(7, key.length - 1);
        filter[filterKey] = request.query[key];
      }
    });

    return Object.keys(filter).length > 0 ? filter : undefined;
  },
);

/**
 * Sort 파라미터 추출
 * @example @Sort() sort: Array<{ field: string; order: 'ASC' | 'DESC' }>
 */
export const Sort = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const sortParam = request.query.sort as string;
    return parseSort(sortParam);
  },
);

/**
 * Pagination 파라미터 추출
 * @example @Pagination() page: { number: number; size: number }
 */
export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const pageNumber = request.query['page[number]'];
    const pageSize = request.query['page[size]'];

    return {
      number: pageNumber ? parseInt(pageNumber as string, 10) : 1,
      size: pageSize ? Math.min(parseInt(pageSize as string, 10), 100) : 10,
    };
  },
);
