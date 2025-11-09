import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { I18nContext } from 'nestjs-i18n';

/**
 * I18n 지원 커스텀 Validation Pipe
 *
 * @description
 * class-validator의 기본 검증 파이프를 확장하여 다국어 오류 메시지를 지원합니다.
 * 클라이언트의 언어 설정에 따라 적절한 오류 메시지를 반환합니다.
 *
 * @example
 * // main.ts에서 전역으로 등록
 * app.useGlobalPipes(new I18nValidationPipe());
 *
 * @example
 * // 특정 컨트롤러/메서드에서 사용
 * @UsePipes(new I18nValidationPipe())
 * @Post()
 * async create(@Body() createDto: CreateUserDto) {
 *   return this.service.create(createDto);
 * }
 */
@Injectable()
export class I18nValidationPipe implements PipeTransform<any> {
  /**
   * 검증 수행
   *
   * @param value 검증할 값
   * @param metadata 메타데이터
   * @returns 검증된 값
   * @throws BadRequestException 검증 실패 시
   */
  async transform(value: any, { metatype }: ArgumentMetadata) {
    // 검증할 타입이 없거나 기본 타입인 경우 검증 스킵
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Plain object를 class instance로 변환
    const object = plainToInstance(metatype, value);

    // class-validator로 검증
    const errors = await validate(object);

    if (errors.length > 0) {
      // I18n 컨텍스트 가져오기
      const i18n = I18nContext.current();

      // 오류 메시지 변환
      const messages = this.formatErrors(errors, i18n);

      throw new BadRequestException({
        statusCode: 400,
        message: i18n?.t('error.validationFailed') || 'Validation failed',
        errors: messages,
      });
    }

    return object;
  }

  /**
   * 검증이 필요한 타입인지 확인
   *
   * @param metatype 메타타입
   * @returns 검증 필요 여부
   */
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * ValidationError를 다국어 메시지로 변환
   *
   * @param errors ValidationError 배열
   * @param i18n I18n 컨텍스트
   * @returns 변환된 오류 메시지 객체
   */
  private formatErrors(
    errors: ValidationError[],
    i18n: I18nContext | undefined,
  ): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    for (const error of errors) {
      const property = error.property;
      const constraints = error.constraints || {};

      formattedErrors[property] = Object.keys(constraints).map((key) => {
        // I18n이 없으면 기본 메시지 사용
        if (!i18n) {
          return constraints[key];
        }

        // 번역 키 생성 (예: validation.isEmail)
        const translationKey = `validation.${key}`;

        // 제약 조건 값 추출 (예: minLength의 경우 최소 길이)
        const constraintValue = this.extractConstraintValue(
          key,
          error.constraints,
        );

        // I18n을 통해 메시지 번역
        return i18n.t(translationKey, {
          args: {
            property: this.translateProperty(property, i18n),
            constraints: constraintValue,
          },
        });
      });
    }

    return formattedErrors;
  }

  /**
   * 제약 조건에서 값 추출
   *
   * @param constraintKey 제약 조건 키
   * @param constraints 제약 조건 객체
   * @returns 제약 조건 값
   */
  private extractConstraintValue(
    constraintKey: string,
    constraints: { [type: string]: string } | undefined,
  ): string {
    if (!constraints || !constraints[constraintKey]) {
      return '';
    }

    const message = constraints[constraintKey];

    // 숫자 추출 (예: "name must be at least 3 characters long" → "3")
    const numberMatch = message.match(/\d+/);
    if (numberMatch) {
      return numberMatch[0];
    }

    // 배열 추출 (예: "role must be one of [admin, user]" → "admin, user")
    const arrayMatch = message.match(/\[(.*?)\]/);
    if (arrayMatch) {
      return arrayMatch[1];
    }

    return '';
  }

  /**
   * 속성명 번역 (필요시 확장 가능)
   *
   * @param property 속성명
   * @param i18n I18n 컨텍스트
   * @returns 번역된 속성명
   */
  private translateProperty(property: string, i18n: I18nContext): string {
    // 필요시 속성명도 번역 가능 (예: validation.properties.email)
    const translationKey = `validation.properties.${property}`;
    const translated = i18n.t(translationKey) as string;

    // 번역이 없으면 원래 속성명 반환
    return translated === translationKey ? property : translated;
  }
}
