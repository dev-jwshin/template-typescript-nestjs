import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../user.entity';
import { JsonApiTransformInterceptor } from '../../../common/interceptors/jsonapi-transform.interceptor';
import { JsonApiResource } from '../../../common/decorators/jsonapi-resource.decorator';
import {
  SparseFields,
  Pagination,
  Sort,
  Filter,
} from '../../../common/decorators/jsonapi-query.decorator';
import { JsonApiValidationPipe } from '../../../common/pipes/jsonapi-validation.pipe';

/**
 * 사용자 컨트롤러 (JSON:API 1.1 스펙 적용)
 * - 사용자 관련 HTTP 엔드포인트 제공
 * - JSON:API 표준 준수
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseInterceptors(JsonApiTransformInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 새 사용자 생성 (JSON:API 형식)
   * @param createUserDto 사용자 생성 데이터
   * @returns 생성된 사용자 정보
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @JsonApiResource('users')
  @ApiOperation({ summary: '새 사용자 생성 (JSON:API)' })
  @ApiResponse({
    status: 201,
    description: '사용자가 성공적으로 생성됨',
    schema: {
      example: {
        jsonapi: { version: '1.1' },
        data: {
          type: 'users',
          id: '1',
          attributes: {
            name: 'John Doe',
            email: 'john@example.com',
            isActive: true,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 422, description: '유효성 검증 실패' })
  create(
    @Body(new JsonApiValidationPipe({ expectedType: 'users' }))
    createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(createUserDto);
  }

  /**
   * 모든 사용자 조회 (JSON:API - Filtering, Sorting, Pagination, Sparse Fieldsets 지원)
   * @returns 사용자 목록
   */
  @Get()
  @JsonApiResource('users')
  @ApiOperation({ summary: '모든 사용자 조회 (JSON:API)' })
  @ApiQuery({
    name: 'fields[users]',
    required: false,
    description: 'Sparse Fieldsets (예: name,email)',
    example: 'name,email',
  })
  @ApiQuery({
    name: 'filter[name]',
    required: false,
    description: '이름 필터링',
    example: 'John',
  })
  @ApiQuery({
    name: 'filter[isActive]',
    required: false,
    description: '활성 상태 필터링',
    example: 'true',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: '정렬 (- prefix로 내림차순)',
    example: '-createdAt,name',
  })
  @ApiQuery({
    name: 'page[number]',
    required: false,
    description: '페이지 번호',
    example: 1,
  })
  @ApiQuery({
    name: 'page[size]',
    required: false,
    description: '페이지 크기 (최대 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: '사용자 목록 반환 (JSON:API)',
    schema: {
      example: {
        jsonapi: { version: '1.1' },
        data: [
          {
            type: 'users',
            id: '1',
            attributes: { name: 'John Doe', email: 'john@example.com' },
          },
        ],
        meta: {
          currentPage: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
        },
        links: {
          self: '/users?page[number]=1&page[size]=10',
          first: '/users?page[number]=1&page[size]=10',
          last: '/users?page[number]=1&page[size]=10',
        },
      },
    },
  })
  findAll(
    @SparseFields('users') fields?: string[],
    @Filter() filter?: Record<string, any>,
    @Sort() sort?: Array<{ field: string; order: 'ASC' | 'DESC' }>,
    @Pagination() page?: { number: number; size: number },
  ) {
    return this.usersService.findAll({ fields, filter, sort, page });
  }

  /**
   * ID로 사용자 조회 (JSON:API)
   * @param id 사용자 ID
   * @returns 사용자 정보
   */
  @Get(':id')
  @JsonApiResource('users')
  @ApiOperation({ summary: 'ID로 사용자 조회 (JSON:API)' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiQuery({
    name: 'fields[users]',
    required: false,
    description: 'Sparse Fieldsets',
    example: 'name,email',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 반환 (JSON:API)',
    schema: {
      example: {
        jsonapi: { version: '1.1' },
        data: {
          type: 'users',
          id: '1',
          attributes: {
            name: 'John Doe',
            email: 'john@example.com',
            isActive: true,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  findOne(
    @Param('id') id: string,
    @SparseFields('users') fields?: string[],
  ) {
    return this.usersService.findOne(id, fields);
  }

  /**
   * 사용자 정보 수정 (JSON:API)
   * @param id 사용자 ID
   * @param updateUserDto 수정할 데이터
   * @returns 수정된 사용자 정보
   */
  @Patch(':id')
  @JsonApiResource('users')
  @ApiOperation({ summary: '사용자 정보 수정 (JSON:API)' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({
    status: 200,
    description: '사용자 정보가 성공적으로 수정됨',
    schema: {
      example: {
        jsonapi: { version: '1.1' },
        data: {
          type: 'users',
          id: '1',
          attributes: {
            name: 'John Updated',
            email: 'john@example.com',
            isActive: true,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  @ApiResponse({ status: 422, description: '유효성 검증 실패' })
  update(
    @Param('id') id: string,
    @Body(new JsonApiValidationPipe({ expectedType: 'users', requireId: true }))
    updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * 사용자 삭제 (JSON:API)
   * @param id 사용자 ID
   * @returns 삭제 성공 (204 No Content)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '사용자 삭제 (JSON:API)' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({
    status: 204,
    description: '사용자가 성공적으로 삭제됨 (No Content)',
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
