import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * 사용자 수정 DTO
 * - CreateUserDto의 모든 필드를 선택적으로 변경
 * - Swagger 문서에서 자동으로 선택적 필드로 표시
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
