import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './database/prisma.module';

/**
 * 애플리케이션 루트 모듈
 * - 환경 변수 설정 (ConfigModule)
 * - 데이터베이스 설정 (PrismaModule)
 * - 기능 모듈 임포트
 * - 글로벌 프로바이더 설정
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
    // 기능 모듈
    HealthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
