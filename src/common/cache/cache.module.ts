import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheFactory } from './cache.factory';

/**
 * 캐시 모듈
 *
 * 애플리케이션 전역에서 사용할 수 있는 캐시 저장소를 제공합니다.
 * @Global 데코레이터로 전역 모듈로 설정되어 다른 모듈에서 import 없이 사용 가능합니다.
 *
 * 사용 예시:
 * ```typescript
 * @Injectable()
 * export class SomeService {
 *   constructor(
 *     @Inject('CACHE_STORE') private cacheStore: CacheStore,
 *   ) {}
 *
 *   async getData(key: string) {
 *     return await this.cacheStore.get(key);
 *   }
 * }
 * ```
 */
@Global()
@Module({
  providers: [
    {
      provide: 'CACHE_STORE',
      useFactory: async (configService: ConfigService) => {
        // 중앙화된 설정에서 캐시 설정 가져오기
        const driver = configService.get<string>('cache.driver', 'memory');

        console.log(`[CacheModule] 캐시 드라이버: ${driver}`);

        // 캐시 저장소 생성
        return await CacheFactory.createFromConfig(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['CACHE_STORE'],
})
export class CacheModule {}
