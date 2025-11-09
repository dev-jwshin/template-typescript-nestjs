import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './admin/users.controller';
import { UsersCrudController } from './api/users-crud.controller';
import { UsersJsonApiController } from './api/users-jsonapi.controller';

/**
 * 사용자 모듈
 * - 사용자 관련 기능 제공
 * - CRUD 작업 지원
 *
 * Controllers:
 * - UsersController: 기존 수동 방식 (260줄) - 테스트를 위해 임시로 비활성화
 * - UsersCrudController: @Crud 데코레이터 방식 - 테스트를 위해 임시로 비활성화
 * - UsersJsonApiController: JSON:API 전용 컨트롤러 ⭐ 활성화
 *
 * Note: JSON:API Transform Middleware는 AppModule에서 글로벌로 적용됨
 */
@Module({
  controllers: [
    // UsersController, // 기존 방식 (호환성 유지) - 경로 충돌로 임시 비활성화
    // UsersCrudController, // @Crud 데코레이터 방식 - 경로 충돌로 임시 비활성화
    UsersJsonApiController, // JSON:API 전용 (/api/users)
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
