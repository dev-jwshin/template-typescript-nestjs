import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma 모듈 (Global)
 * - 전역 모듈로 설정하여 모든 모듈에서 PrismaService 사용 가능
 * - import 없이 자동으로 주입 가능
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
