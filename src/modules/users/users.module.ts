import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './api/users.controller';
import { AdminUsersController } from './admin/users.controller';

/**
 * 사용자 모듈
 * - 사용자 관련 기능 제공
 * - CRUD 작업 지원
 *
 *
 * Note: JSON:API Transform Middleware는 AppModule에서 글로벌로 적용됨
 */
@Module({
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
