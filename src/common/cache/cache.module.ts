import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheFactory } from './cache.factory';
import { CacheService } from './cache.service';
import { CacheMetricsService } from './metrics/cache-metrics.service';
import { CacheTagsService } from './tags/cache-tags.service';
import { DistributedLockService } from './locks/distributed-lock.service';

/**
 * 캐시 모듈
 *
 * 애플리케이션 전역에서 사용할 수 있는 캐시 저장소 및 고급 서비스를 제공합니다.
 * @Global 데코레이터로 전역 모듈로 설정되어 다른 모듈에서 import 없이 사용 가능합니다.
 *
 * 주요 기능:
 * - CacheService: 고수준 캐싱 API (remember, mget, increment 등)
 * - CacheMetricsService: 성능 모니터링 (Hit/Miss 통계)
 * - CacheTagsService: 태그 기반 그룹 무효화
 * - DistributedLockService: 분산 락 메커니즘
 * - CACHE_STORE: 저장소 인터페이스
 *
 * 사용 예시:
 * ```typescript
 * @Injectable()
 * export class UsersService {
 *   constructor(
 *     private readonly cache: CacheService,
 *     private readonly cacheTags: CacheTagsService, // 선택적
 *     private readonly lockService: DistributedLockService, // 선택적
 *   ) {}
 *
 *   async findOne(id: string) {
 *     return this.cache.remember(`user:${id}`, 3600, async () => {
 *       return this.prisma.user.findUnique({ where: { id } });
 *     });
 *   }
 *
 *   async createWithLock(createDto: CreateUserDto) {
 *     return this.lockService.withLock('create-user', async () => {
 *       return this.create(createDto);
 *     }, 10);
 *   }
 *
 *   async invalidateAllUsers() {
 *     await this.cacheTags.invalidateTag('users');
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
    CacheMetricsService,
    CacheTagsService,
    DistributedLockService,
    CacheService,
  ],
  exports: [
    'CACHE_STORE',
    CacheService,
    CacheMetricsService,
    CacheTagsService,
    DistributedLockService,
  ],
})
export class CacheModule {}
