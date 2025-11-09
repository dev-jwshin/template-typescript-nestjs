import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../../common/crud';
import { UsersService } from '../users.service';

/**
 * Users API 컨트롤러
 *
 * 일반 사용자용 API 엔드포인트를 제공합니다.
 */
@Crud({
  only: [
    CrudOperation.Index, // GET /api/users
    CrudOperation.Show, // GET /api/users/:id
    // TODO: 필요한 작업만 활성화
    // CrudOperation.Create,  // POST /api/users
    // CrudOperation.Update,  // PATCH /api/users/:id
    // CrudOperation.Delete,  // DELETE /api/users/:id
  ],
  resourceType: 'users',
  allowedFilters: {
    // TODO: 허용할 필터 설정
    // name: ['eq', 'like'],
    // isActive: ['eq'],
  },
  allowedSorts: ['createdAt', 'updatedAt'],
  allowedIncludes: [], // TODO: 허용할 관계 설정
  pagination: {
    defaultLimit: 20,
    limit: 100,
  },
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * TODO: 커스텀 엔드포인트 추가
   *
   * @example
   * @Get('search')
   * async search(@Query('q') query: string) {
   *   return this.usersService.search(query);
   * }
   */
}
