/**
 * 재귀적 직렬화 예제
 *
 * Post와 Comment 모델을 사용하여 include로 가져온 관계 데이터에도
 * serialize.exclude가 올바르게 적용되는지 보여줍니다.
 */

import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../src/common/crud';
import { PrismaService } from '../src/database/prisma.service';

/**
 * Comment 엔티티 (예제)
 */
interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorEmail: string; // 민감 정보
  authorIp: string; // 민감 정보
  postId: string;
  createdAt: Date;
}

/**
 * Post 엔티티 (예제)
 */
interface Post {
  id: string;
  title: string;
  content: string;
  isDraft: boolean; // 민감 정보
  authorId: string;
  createdAt: Date;
  comments?: Comment[];
}

/**
 * 방법 1: @CrudEntity 데코레이터 사용 (권장) ⭐
 */

// Comment Entity
@CrudEntity({
  modelName: 'comment',
  serialize: {
    exclude: ['authorEmail', 'authorIp'], // ✅ 민감 정보 제외
  },
})
class CommentEntity {
  id: string;
  content: string;
  authorEmail: string; // ❌ 응답에서 제외됨
  authorIp: string; // ❌ 응답에서 제외됨
}

// Post Entity
@CrudEntity({
  modelName: 'post',
  allowedIncludes: ['comments'],
  serialize: {
    exclude: ['isDraft'], // ✅ 민감 정보 제외
    relations: {
      comments: 'comment', // comments 관계 → comment 모델 서비스 사용
    },
  },
})
class PostEntity {
  id: string;
  title: string;
  isDraft: boolean; // ❌ 응답에서 제외됨
  comments?: Comment[];
}

// Comments 서비스 (간소화)
@Injectable()
export class CommentsService extends CrudBaseService<Comment> {
  constructor(prisma: PrismaService) {
    super(prisma, CommentEntity); // ✅ Entity 클래스만 전달
  }
}

// Posts 서비스 (간소화)
@Injectable()
export class PostsService extends CrudBaseService<Post> {
  constructor(prisma: PrismaService) {
    super(prisma, PostEntity); // ✅ Entity 클래스만 전달
  }
}

/**
 * 방법 2: 기존 방식 (config 전달)
 */

// Comments 서비스
// @Injectable()
// export class CommentsService extends CrudBaseService<Comment> {
//   constructor(prisma: PrismaService) {
//     super(prisma, 'comment', {
//       serialize: {
//         exclude: ['authorEmail', 'authorIp'], // ✅ 민감 정보 제외
//       },
//     });
//   }
// }

// Posts 서비스
// @Injectable()
// export class PostsService extends CrudBaseService<Post> {
//   constructor(prisma: PrismaService) {
//     super(prisma, 'post', {
//       allowedIncludes: ['comments'],
//       serialize: {
//         exclude: ['isDraft'], // ✅ 민감 정보 제외
//         relations: {
//           comments: 'comment', // comments 관계 → comment 모델 서비스 사용
//         },
//       },
//     });
//   }
// }

/**
 * 사용 예시
 */
async function example() {
  // GET /posts?include=comments
  const post = await postsService.findOne('post-123');

  console.log('응답 결과:');
  console.log(JSON.stringify(post, null, 2));
}

/**
 * 예상 응답:
 *
 * {
 *   "id": "post-123",
 *   "title": "재귀적 직렬화 테스트",
 *   "content": "본문 내용...",
 *   // isDraft: false,  ❌ 제외됨 (Post serialize.exclude)
 *   "authorId": "user-1",
 *   "createdAt": "2025-11-09T...",
 *   "comments": [
 *     {
 *       "id": "comment-1",
 *       "content": "댓글 내용...",
 *       "authorName": "홍길동",
 *       // authorEmail: "hong@example.com",  ❌ 제외됨 (Comment serialize.exclude)
 *       // authorIp: "192.168.1.1",          ❌ 제외됨 (Comment serialize.exclude)
 *       "postId": "post-123",
 *       "createdAt": "2025-11-09T..."
 *     },
 *     {
 *       "id": "comment-2",
 *       "content": "또 다른 댓글...",
 *       "authorName": "김철수",
 *       // authorEmail: "kim@example.com",   ❌ 제외됨
 *       // authorIp: "192.168.1.2",          ❌ 제외됨
 *       "postId": "post-123",
 *       "createdAt": "2025-11-09T..."
 *     }
 *   ]
 * }
 */

/**
 * 기존 방식 vs 재귀적 직렬화
 *
 * ❌ 기존 방식 (문제):
 * - include로 가져온 comments에는 serialize.exclude 미적용
 * - authorEmail, authorIp가 그대로 노출됨
 * - 보안 취약점 발생
 *
 * ✅ 재귀적 직렬화 (해결):
 * - 관계 데이터에도 각 모델의 serialize 설정 자동 적용
 * - 민감 정보 자동 제거
 * - 보안 강화
 */

/**
 * 설정 방법
 *
 * 1. Comment 서비스에서 serialize.exclude 설정
 * 2. Post 서비스에서 serialize.relations 설정
 *    - 키: 관계 필드명 (comments)
 *    - 값: 관계 모델명 (comment)
 * 3. ServiceRegistry에 자동 등록됨 (CrudBaseService 생성자)
 * 4. include 시 자동으로 관계 서비스의 serialize 호출
 */

/**
 * Prisma 스키마 예시
 *
 * model Post {
 *   id        String    @id @default(uuid())
 *   title     String
 *   content   String
 *   isDraft   Boolean   @default(false)
 *   authorId  String
 *   createdAt DateTime  @default(now())
 *   comments  Comment[]
 *
 *   @@map("posts")
 * }
 *
 * model Comment {
 *   id          String   @id @default(uuid())
 *   content     String
 *   authorName  String
 *   authorEmail String
 *   authorIp    String
 *   postId      String
 *   createdAt   DateTime @default(now())
 *
 *   post Post @relation(fields: [postId], references: [id])
 *
 *   @@map("comments")
 * }
 */
