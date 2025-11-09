import { Module, OnModuleInit } from '@nestjs/common';
import { SerializerRegistry } from '../../common/crud/serializers/serializer-registry';
import { ProfileSerializer } from './profile.serializer';

/**
 * Profiles 모듈
 *
 * Profile 관련 기능을 제공합니다.
 * 모듈 초기화 시 ProfileSerializer를 SerializerRegistry에 자동 등록합니다.
 */
@Module({
  controllers: [],
  providers: [],
  exports: [],
})
export class ProfilesModule implements OnModuleInit {
  /**
   * 모듈 초기화 시 Serializer 등록
   */
  onModuleInit() {
    // ProfileSerializer를 SerializerRegistry에 등록
    SerializerRegistry.register('profile', new ProfileSerializer());
  }
}
