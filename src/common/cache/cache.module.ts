import { Global, Module } from '@nestjs/common';
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
      useFactory: async () => {
        // 환경 변수 검증
        const validation = CacheFactory.validateConfig();
        validation.messages.forEach((msg) => console.log(msg));

        // 캐시 저장소 생성
        return await CacheFactory.create();
      },
    },
  ],
  exports: ['CACHE_STORE'],
})
export class CacheModule {}
