import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  I18nModule,
  AcceptLanguageResolver,
  QueryResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { CacheModule } from './common/cache/cache.module';
import { JsonApiTransformMiddleware } from './common/middlewares/jsonapi-transform.middleware';
import { JsonApiTransformInterceptor } from './common/interceptors/jsonapi-transform.interceptor';
import { ALL_MODULES } from './modules';
import configuration from './config/configuration';

/**
 * 애플리케이션 루트 모듈
 *
 * @description
 * - 환경 변수 설정 (ConfigModule)
 * - 다국어 지원 (I18nModule)
 * - 데이터베이스 설정 (PrismaModule)
 * - 기능 모듈 자동 임포트 (ALL_MODULES)
 * - 글로벌 프로바이더 설정
 * - JSON:API Transform Middleware 글로벌 적용
 * - JSON:API Transform Interceptor 글로벌 적용 (APP_INTERCEPTOR)
 *
 * @remarks
 * 기능 모듈은 src/modules/index.ts에서 자동으로 로드됩니다.
 * 새 모듈 생성 시 별도 import 추가 불필요 (빌드 시 자동 반영)
 */
@Module({
  imports: [
    // 환경 변수 설정 (중앙화)
    ConfigModule.forRoot({
      isGlobal: true, // 전역으로 사용 가능
      load: [configuration], // 중앙화된 설정 파일 로드
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      cache: true, // 환경 변수 캐싱
    }),
    // 다국어 설정 (I18n)
    I18nModule.forRoot({
      fallbackLanguage: 'ko', // 기본 언어
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true, // 개발 모드에서 파일 변경 감지
      },
      resolvers: [
        // ?lang=en 쿼리 파라미터로 언어 설정
        { use: QueryResolver, options: ['lang'] },
        // Accept-Language 헤더로 언어 자동 감지
        AcceptLanguageResolver,
        // X-Custom-Lang 헤더로 언어 설정
        new HeaderResolver(['x-custom-lang']),
      ],
    }),
    // 데이터베이스 설정
    PrismaModule,
    // 캐시 설정
    CacheModule,
    // 기능 모듈 (자동 로드)
    ...ALL_MODULES,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // JSON:API Transform Interceptor 글로벌 등록
    // Reflector를 통해 @JsonApiResource 데코레이터가 적용된 컨트롤러만 자동 변환
    {
      provide: APP_INTERCEPTOR,
      useClass: JsonApiTransformInterceptor,
    },
  ],
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
