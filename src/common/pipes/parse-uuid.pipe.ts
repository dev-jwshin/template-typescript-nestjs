import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate as isUUID } from 'uuid';

/**
 * UUID 파싱 파이프
 * - 문자열이 유효한 UUID 형식인지 검증
 * - 유효하지 않은 경우 BadRequestException 발생
 */
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUUID(value)) {
      throw new BadRequestException(`${value}는 유효한 UUID 형식이 아닙니다.`);
    }
    return value;
  }
}
