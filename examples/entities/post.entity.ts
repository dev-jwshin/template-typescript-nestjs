import { CrudEntity } from '../../src/common/crud';
import { Comment } from './comment.entity';

/**
 * Post 엔티티
 *
 * @CrudEntity 데코레이터를 사용하여 CRUD 설정을 Entity에 직접 정의합니다.
 * Service 레이어에서 별도 config 전달 불필요합니다.
 */
@CrudEntity({
  modelName: 'post', // Prisma 모델 이름 (소문자 단수형)
  allowedIncludes: ['comments'], // 허용된 관계
  serialize: {
    exclude: ['isDraft'], // 응답에서 제외할 필드

    // ✅ 재귀적 직렬화 설정
    relations: {
      comments: 'comment', // comments 관계 → comment 모델 서비스 사용
    },
  },
})
export class Post {
  id: string;
  title: string;
  content: string;
  isDraft: boolean; // ❌ 응답에서 제외됨
  authorId: string;
  createdAt: Date;
  comments?: Comment[];
}
