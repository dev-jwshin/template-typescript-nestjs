import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CrudOperation } from '../types/crud-operation.enum';

/**
 * Swagger 고급 설정 데코레이터
 *
 * CRUD 엔드포인트에 대한 Swagger 문서를 자동 생성합니다.
 */

/**
 * Swagger 설정 옵션
 */
export interface SwaggerOptions {
  /**
   * 리소스 이름 (예: 'users', 'posts')
   */
  resource: string;

  /**
   * 모델 이름 (예: 'User', 'Post')
   */
  model: string;

  /**
   * API 태그
   */
  tags?: string[];

  /**
   * 작업별 커스텀 설정
   */
  operations?: Partial<Record<CrudOperation, OperationSwaggerConfig>>;
}

/**
 * 작업별 Swagger 설정
 */
export interface OperationSwaggerConfig {
  /**
   * 요약 (짧은 설명)
   */
  summary?: string;

  /**
   * 상세 설명
   */
  description?: string;

  /**
   * 응답 예시
   */
  example?: any;

  /**
   * 추가 쿼리 파라미터
   */
  queryParams?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    type?: any;
  }>;
}

/**
 * CRUD 작업에 대한 기본 Swagger 메타데이터 생성
 */
export function CrudSwagger(options: SwaggerOptions) {
  const { resource, model, tags = [model] } = options;

  return applyDecorators(
    ApiTags(...tags),
  );
}

/**
 * Index 엔드포인트 Swagger 문서
 */
export function SwaggerIndex(options: SwaggerOptions) {
  const { resource, model } = options;
  const opConfig = options.operations?.[CrudOperation.Index];

  return applyDecorators(
    ApiOperation({
      summary: opConfig?.summary || `${model} 목록 조회`,
      description:
        opConfig?.description ||
        `모든 ${model} 항목을 페이지네이션과 함께 조회합니다. 필터, 정렬, include를 지원합니다.`,
    }),
    ApiQuery({
      name: 'page[number]',
      required: false,
      description: '페이지 번호 (1부터 시작)',
      type: Number,
      example: 1,
    }),
    ApiQuery({
      name: 'page[size]',
      required: false,
      description: '페이지 크기',
      type: Number,
      example: 10,
    }),
    ApiQuery({
      name: 'sort',
      required: false,
      description: '정렬 필드 (- 접두사로 내림차순)',
      type: String,
      example: '-createdAt',
    }),
    ApiQuery({
      name: 'include',
      required: false,
      description: '포함할 관계 (쉼표로 구분)',
      type: String,
      example: 'profile,roles',
    }),
    ApiResponse({
      status: 200,
      description: '성공',
      schema: {
        example: opConfig?.example || {
          jsonapi: { version: '1.1' },
          data: [
            {
              type: resource,
              id: '1',
              attributes: {},
            },
          ],
          meta: {
            pagination: {
              page: 1,
              perPage: 10,
              total: 100,
              totalPages: 10,
            },
          },
        },
      },
    }),
  );
}

/**
 * Show 엔드포인트 Swagger 문서
 */
export function SwaggerShow(options: SwaggerOptions) {
  const { resource, model } = options;
  const opConfig = options.operations?.[CrudOperation.Show];

  return applyDecorators(
    ApiOperation({
      summary: opConfig?.summary || `${model} 단일 조회`,
      description: opConfig?.description || `ID로 특정 ${model} 항목을 조회합니다.`,
    }),
    ApiParam({
      name: 'id',
      description: `${model} ID`,
      type: String,
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiQuery({
      name: 'include',
      required: false,
      description: '포함할 관계 (쉼표로 구분)',
      type: String,
      example: 'profile',
    }),
    ApiResponse({
      status: 200,
      description: '성공',
      schema: {
        example: opConfig?.example || {
          jsonapi: { version: '1.1' },
          data: {
            type: resource,
            id: '1',
            attributes: {},
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '항목을 찾을 수 없습니다',
    }),
  );
}

/**
 * Create 엔드포인트 Swagger 문서
 */
export function SwaggerCreate(options: SwaggerOptions) {
  const { resource, model } = options;
  const opConfig = options.operations?.[CrudOperation.Create];

  return applyDecorators(
    ApiOperation({
      summary: opConfig?.summary || `${model} 생성`,
      description: opConfig?.description || `새로운 ${model} 항목을 생성합니다.`,
    }),
    ApiResponse({
      status: 201,
      description: '생성 성공',
      schema: {
        example: opConfig?.example || {
          jsonapi: { version: '1.1' },
          data: {
            type: resource,
            id: '1',
            attributes: {},
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 요청 데이터',
    }),
  );
}

/**
 * Update 엔드포인트 Swagger 문서
 */
export function SwaggerUpdate(options: SwaggerOptions) {
  const { resource, model } = options;
  const opConfig = options.operations?.[CrudOperation.Update];

  return applyDecorators(
    ApiOperation({
      summary: opConfig?.summary || `${model} 수정`,
      description: opConfig?.description || `기존 ${model} 항목을 수정합니다.`,
    }),
    ApiParam({
      name: 'id',
      description: `${model} ID`,
      type: String,
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiResponse({
      status: 200,
      description: '수정 성공',
      schema: {
        example: opConfig?.example || {
          jsonapi: { version: '1.1' },
          data: {
            type: resource,
            id: '1',
            attributes: {},
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '항목을 찾을 수 없습니다',
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 요청 데이터',
    }),
  );
}

/**
 * Delete 엔드포인트 Swagger 문서
 */
export function SwaggerDelete(options: SwaggerOptions) {
  const { model } = options;
  const opConfig = options.operations?.[CrudOperation.Delete];

  return applyDecorators(
    ApiOperation({
      summary: opConfig?.summary || `${model} 삭제`,
      description: opConfig?.description || `기존 ${model} 항목을 삭제합니다.`,
    }),
    ApiParam({
      name: 'id',
      description: `${model} ID`,
      type: String,
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiResponse({
      status: 204,
      description: '삭제 성공 (응답 없음)',
    }),
    ApiResponse({
      status: 404,
      description: '항목을 찾을 수 없습니다',
    }),
  );
}

/**
 * CRUD 작업별 Swagger 데코레이터 매핑
 */
export const SwaggerOperationDecorators = {
  [CrudOperation.Index]: SwaggerIndex,
  [CrudOperation.Show]: SwaggerShow,
  [CrudOperation.Create]: SwaggerCreate,
  [CrudOperation.Update]: SwaggerUpdate,
  [CrudOperation.Delete]: SwaggerDelete,
};
