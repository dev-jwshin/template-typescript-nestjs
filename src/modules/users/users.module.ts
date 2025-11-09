import { Module, OnModuleInit } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './api/users.controller';
import { SerializerRegistry } from '../../common/crud/serializers/serializer-registry';
import { UserSerializer } from './user.serializer';
// import { AdminUsersController } from './admin/users.controller'; // 관리자 컨트롤러 필요시 활성화

/**
 * Users 모듈
 *
 * User 관련 컨트롤러와 서비스를 등록합니다.
 * 모듈 초기화 시 UserSerializer를 SerializerRegistry에 자동 등록합니다.
 */
@Module({
  controllers: [
    UsersController, // 일반 사용자 API
    // AdminUsersController, // 관리자 API (필요시 활성화)
  ],
  providers: [UsersService],
  exports: [UsersService], // 다른 모듈에서 사용 가능
})
export class UsersModule implements OnModuleInit {
  /**
   * 모듈 초기화 시 Serializer 등록
   */
  onModuleInit() {
    // UserSerializer를 SerializerRegistry에 등록
    SerializerRegistry.register('user', new UserSerializer());
  }
}
