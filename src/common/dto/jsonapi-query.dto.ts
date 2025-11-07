/**
 * JSON:API 쿼리 파라미터 DTO
 * Sparse Fieldsets, Filtering, Sorting, Pagination 지원
 */

import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * JSON:API 쿼리 파라미터 기본 DTO
 */
export class JsonApiQueryDto {
  /**
   * Sparse Fieldsets - 특정 필드만 반환
   * @example ?fields[users]=name,email
   */
  @ApiPropertyOptional({
    description: 'Sparse Fieldsets - 특정 필드만 반환',
    example: 'name,email',
  })
  @IsOptional()
  fields?: Record<string, string>;

  /**
   * Include - 관련 리소스 포함
   * @example ?include=posts,comments
   */
  @ApiPropertyOptional({
    description: 'Include related resources',
    example: 'posts,comments',
  })
  @IsOptional()
  include?: string;

  /**
   * Filter - 필터링 조건
   * @example ?filter[status]=active&filter[age][gte]=18
   */
  @ApiPropertyOptional({
    description: 'Filtering conditions',
    example: { status: 'active' },
  })
  @IsOptional()
  filter?: Record<string, any>;

  /**
   * Sort - 정렬 필드 (- prefix로 내림차순)
   * @example ?sort=-createdAt,name
   */
  @ApiPropertyOptional({
    description: 'Sorting fields (- prefix for descending)',
    example: '-createdAt,name',
  })
  @IsOptional()
  sort?: string;

  /**
   * Page - 페이지네이션
   */
  @ApiPropertyOptional({
    description: 'Pagination',
    type: 'object',
    properties: {
      number: { type: 'integer', minimum: 1, default: 1 },
      size: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    },
  })
  @IsOptional()
  page?: {
    number?: number;
    size?: number;
  };
}

/**
 * 페이지네이션 DTO
 */
export class PaginationDto {
  @ApiPropertyOptional({ description: '페이지 번호', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number?: number = 1;

  @ApiPropertyOptional({
    description: '페이지 크기',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number = 10;
}

/**
 * 페이지네이션 응답 메타 정보
 */
export interface PaginatedResponseMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * 페이지네이션 응답 형식
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginatedResponseMeta;
}
