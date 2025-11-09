import { CrudEntity } from '../../src/common/crud';

/**
 * Comment 엔티티
 *
 * @CrudEntity 데코레이터를 사용하여 CRUD 설정을 Entity에 직접 정의합니다.
 * Service 레이어에서 별도 config 전달 불필요합니다.
 */
@CrudEntity({
  modelName: 'comment', // Prisma 모델 이름 (소문자 단수형)
  serialize: {
    exclude: ['authorEmail', 'authorIp'], // 응답에서 제외할 민감한 필드
  },
})
export class Comment {
  id: string;
  content: string;
  authorName: string;
  authorEmail: string; // ❌ 응답에서 제외됨
  authorIp: string; // ❌ 응답에서 제외됨
  postId: string;
  createdAt: Date;
}
