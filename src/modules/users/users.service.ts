import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../common/crud/services/crud-base.service';
import { PrismaService } from '../../database/prisma.service';
import { User } from './user.entity';

/**
 * User 서비스
 *
 * CrudBaseService를 상속하여 기본 CRUD 작업을 자동으로 구현합니다.
 */
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      allowedIncludes: [], // TODO: 허용할 관계 설정 (예: ['profile', 'posts'])
      allowedFilters: {
        // TODO: 허용할 필터 설정
        // name: ['eq', 'like', 'ilike'],
        // email: ['eq'],
        // isActive: ['eq'],
      },
      allowedSorts: ['createdAt', 'updatedAt'], // TODO: 허용할 정렬 필드 설정
      performance: {
        query: { eagerLoad: true }, // N+1 쿼리 자동 최적화
      },
      // 직렬화는 user.serializer.ts에서 관리 (파일 기반 Serializer 사용)
    });
  }

  /**
   * TODO: 커스텀 메서드 추가
   *
   * @example
   * async findByEmail(email: string): Promise<User | null> {
   *   const user = await this.model.findUnique({
   *     where: { email },
   *   });
   *   return user ? this.serialize(user) : null;
   * }
   */
}
