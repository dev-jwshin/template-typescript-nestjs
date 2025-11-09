import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../../common/crud';
import { UsersService } from '../users.service';

/**
 * Users 관리자 컨트롤러
 *
 * 관리자 전용 API 엔드포인트를 제공합니다.
 */
@Crud({
  only: [
    CrudOperation.Index, // GET /admin/users
    CrudOperation.Show, // GET /admin/users/:id
    CrudOperation.Create, // POST /admin/users
    CrudOperation.Update, // PATCH /admin/users/:id
    CrudOperation.Delete, // DELETE /admin/users/:id
  ],
  resourceType: 'users',
  allowedFilters: {
    // TODO: 허용할 필터 설정
  },
  allowedSorts: ['createdAt', 'updatedAt'],
  allowedIncludes: [],
  allowedParams: {
    // TODO: 필수/선택 파라미터 설정
  },
})
// @UseGuards(AdminGuard) // TODO: 관리자 가드 추가
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}
}
