/**
 * JSON:API 요청 바디 검증 파이프
 * POST/PATCH 요청의 JSON:API 형식 검증
 */

import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { ResourceObject } from '../interfaces/jsonapi.interface';

/**
 * JSON:API 요청 바디 검증 옵션
 */
export interface JsonApiValidationOptions {
  /**
   * 예상되는 리소스 타입
   */
  expectedType?: string;

  /**
   * ID 필수 여부 (PATCH 요청 등)
   */
  requireId?: boolean;
}

/**
 * JSON:API 요청 바디 검증 파이프
 */
@Injectable()
export class JsonApiValidationPipe implements PipeTransform {
  constructor(private readonly options?: JsonApiValidationOptions) {}

  transform(value: any, metadata: ArgumentMetadata): any {
    // body가 아닌 경우 패스
    if (metadata.type !== 'body') {
      return value;
    }

    // JSON:API 형식 검증
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Request body must be a JSON object');
    }

    if (!value.data) {
      throw new BadRequestException('Request body must contain "data" property');
    }

    const data = value.data as ResourceObject;

    // type 검증
    if (!data.type) {
      throw new BadRequestException('Resource object must have a "type" property');
    }

    if (this.options?.expectedType && data.type !== this.options.expectedType) {
      throw new BadRequestException(
        `Expected resource type "${this.options.expectedType}", but got "${data.type}"`,
      );
    }

    // id 검증
    if (this.options?.requireId && !data.id) {
      throw new BadRequestException('Resource object must have an "id" property');
    }

    // attributes 추출하여 반환 (컨트롤러에서 DTO로 변환하기 쉽게)
    return data.attributes || {};
  }
}
