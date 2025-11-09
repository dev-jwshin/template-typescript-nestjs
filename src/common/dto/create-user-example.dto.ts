import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 사용자 역할 Enum
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

/**
 * 사용자 생성 DTO (I18n 검증 예시)
 *
 * @description
 * I18n 다국어 검증 메시지를 지원하는 예시 DTO입니다.
 * class-validator 데코레이터를 사용하여 검증하며,
 * I18nValidationPipe를 통해 자동으로 다국어 오류 메시지가 반환됩니다.
 *
 * @example
 * // 한국어 오류 메시지 (기본)
 * POST /api/users
 * {
 *   "name": "",
 *   "email": "invalid-email",
 *   "age": 200
 * }
 * →
 * {
 *   "statusCode": 400,
 *   "message": "유효성 검증에 실패했습니다.",
 *   "errors": {
 *     "name": ["name은(는) 비어있을 수 없습니다.", "name은(는) 최소 2 자 이상이어야 합니다."],
 *     "email": ["email은(는) 유효한 이메일 주소여야 합니다."],
 *     "age": ["age은(는) 120 이하여야 합니다."]
 *   }
 * }
 *
 * @example
 * // 영어 오류 메시지 (?lang=en 쿼리 파라미터 또는 Accept-Language 헤더)
 * POST /api/users?lang=en
 * →
 * {
 *   "statusCode": 400,
 *   "message": "Validation failed",
 *   "errors": {
 *     "name": ["name should not be empty.", "name must be at least 2 characters long."],
 *     "email": ["email must be a valid email address."],
 *     "age": ["age must be at most 120."]
 *   }
 * }
 */
export class CreateUserExampleDto {
  /**
   * 사용자 이름
   */
  @ApiProperty({
    description: '사용자 이름',
    example: 'John Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  /**
   * 이메일 주소
   */
  @ApiProperty({
    description: '이메일 주소',
    example: 'john@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * 비밀번호
   */
  @ApiProperty({
    description: '비밀번호 (최소 8자)',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  /**
   * 나이 (선택)
   */
  @ApiPropertyOptional({
    description: '나이',
    example: 25,
    minimum: 1,
    maximum: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  /**
   * 사용자 역할 (선택)
   */
  @ApiPropertyOptional({
    description: '사용자 역할',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
