import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../src/common/crud';
import { PrismaService } from '../../src/database/prisma.service';
import { Comment } from '../entities/comment.entity';

/**
 * Comments 서비스 (간소화된 버전)
 *
 * ✅ @CrudEntity 데코레이터 사용으로 super() 호출 시 config 전달 불필요
 */
@Injectable()
export class CommentsService extends CrudBaseService<Comment> {
  constructor(prisma: PrismaService) {
    super(prisma, Comment); // ✅ Entity 클래스만 전달
  }
}

/**
 * 이전 방식 (더 이상 필요 없음):
 *
 * @Injectable()
 * export class CommentsService extends CrudBaseService<Comment> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'comment', {
 *       serialize: {
 *         exclude: ['authorEmail', 'authorIp'],
 *       },
 *     });
 *   }
 * }
 */
