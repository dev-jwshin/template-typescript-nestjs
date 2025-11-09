import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/**
 * User 수정 DTO
 *
 * CreateUserDto의 모든 필드를 선택적으로 만듭니다.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
