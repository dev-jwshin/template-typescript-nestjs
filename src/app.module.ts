import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './database/prisma.module';
import { CacheModule } from './common/cache/cache.module';
import { JsonApiTransformMiddleware } from './common/middlewares/jsonapi-transform.middleware';

/**
 * 애플리케이션 루트 모듈
 * - 환경 변수 설정 (ConfigModule)
 * - 데이터베이스 설정 (PrismaModule)
 * - 기능 모듈 임포트
 * - 글로벌 프로바이더 설정
 * - JSON:API Transform Middleware 글로벌 적용
 */
@Module({
  imports: [
    // 환경 변수 설정
    ConfigModule.forRoot({
      isGlobal: true, // 전역으로 사용 가능
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      cache: true, // 환경 변수 캐싱
    }),
    // 데이터베이스 설정
    PrismaModule,
    // 캐시 설정
    CacheModule,
    // 기능 모듈
    HealthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  /**
   * JSON:API Transform Middleware를 모든 POST, PATCH, PUT 요청에 적용
   * Body parser 이후, ValidationPipe 이전에 실행됨
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JsonApiTransformMiddleware)
      .forRoutes(
        { path: '*', method: RequestMethod.POST },
        { path: '*', method: RequestMethod.PATCH },
        { path: '*', method: RequestMethod.PUT },
      );
  }
}
