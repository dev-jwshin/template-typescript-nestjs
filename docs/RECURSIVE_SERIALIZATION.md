# 재귀적 직렬화 가이드

> include로 가져온 관계 데이터에도 각 모델의 serialize.exclude 설정이 자동 적용됩니다.

## 📋 목차

- [개요](#개요)
- [문제 상황](#문제-상황)
- [해결 방법](#해결-방법)
- [사용 가이드](#사용-가이드)
- [실전 예제](#실전-예제)
- [주의사항](#주의사항)

---

## 개요

### 기존 문제점

`serialize.exclude`는 **최상위 엔티티의 필드만 제거**하고, **include로 가져온 관계 데이터는 그대로 노출**되는 문제가 있었습니다.

```typescript
// Comments 서비스
@Injectable()
export class CommentsService extends CrudBaseService<Comment> {
  constructor(prisma: PrismaService) {
    super(prisma, 'comment', {
      serialize: {
        exclude: ['authorEmail', 'authorIp'],  // ❌ include 시 무시됨!
      },
    });
  }
}

// Posts 서비스
@Injectable()
export class PostsService extends CrudBaseService<Post> {
  constructor(prisma: PrismaService) {
    super(prisma, 'post', {
      allowedIncludes: ['comments'],
      serialize: {
        exclude: ['isDraft'],
      },
    });
  }
}
```

```bash
GET /posts?include=comments
```

**기존 응답 (문제)**:
```json
{
  "id": "post-1",
  "title": "제목",
  "comments": [
    {
      "id": "comment-1",
      "authorEmail": "user@example.com",  // ❌ 노출됨!
      "authorIp": "192.168.1.1"           // ❌ 노출됨!
    }
  ]
}
```

### 해결 방법

재귀적 직렬화를 통해 관계 데이터에도 각 모델의 serialize 설정이 자동 적용됩니다.

---

## 해결 방법

### 1. ServiceRegistry 시스템

모든 CRUD 서비스는 생성 시 자동으로 레지스트리에 등록됩니다.

```typescript
// CrudBaseService 생성자
constructor(prisma: PrismaService, modelName: string, config: ...) {
  this.queryBuilder = new PrismaQueryBuilder();

  // ✅ 자동 등록
  ServiceRegistry.register(this.modelName, this);
}
```

### 2. serialize.relations 설정

관계 필드명과 모델명을 매핑합니다.

```typescript
serialize: {
  exclude: ['isDraft'],
  relations: {
    comments: 'comment',  // comments 필드 → comment 모델 서비스
    author: 'user',       // author 필드 → user 모델 서비스
  }
}
```

### 3. 재귀적 직렬화 로직

```typescript
protected serialize(entity: any): T {
  // 1. 최상위 필드 제거
  if (this.config.serialize?.exclude) {
    this.config.serialize.exclude.forEach(field => {
      delete entity[field];
    });
  }

  // 2. ✅ 관계 데이터 재귀 직렬화
  if (this.config.serialize?.relations) {
    Object.entries(this.config.serialize.relations).forEach(
      ([relationField, modelName]) => {
        const relationData = entity[relationField];

        if (relationData) {
          const relationService = ServiceRegistry.get(modelName);

          if (relationService) {
            entity[relationField] = Array.isArray(relationData)
              ? relationData.map(item => relationService.serialize(item))
              : relationService.serialize(relationData);
          }
        }
      }
    );
  }

  return entity;
}
```

---

## 사용 가이드

#### Step 1: Comment 서비스 설정

```typescript
// src/modules/comments/comments.service.ts
import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../common/crud';
import { PrismaService } from '../../database/prisma.service';
import { Comment } from './comment.entity';

@Injectable()
export class CommentsService extends CrudBaseService<Comment> {
  constructor(prisma: PrismaService) {
    super(prisma, 'comment', {
      serialize: {
        exclude: ['authorEmail', 'authorIp'],  // ✅ 민감 정보 제외
      },
    });
  }
}
```

#### Step 2: Post 서비스에 relations 설정 추가

```typescript
// src/modules/posts/posts.service.ts
import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../common/crud';
import { PrismaService } from '../../database/prisma.service';
import { Post } from './post.entity';

@Injectable()
export class PostsService extends CrudBaseService<Post> {
  constructor(prisma: PrismaService) {
    super(prisma, 'post', {
      allowedIncludes: ['comments'],

      serialize: {
        exclude: ['isDraft'],

        // ✅ 관계 직렬화 설정 추가
        relations: {
          comments: 'comment',  // comments 관계 → comment 모델 서비스 사용
        },
      },
    });
  }
}
```

### API 호출

```bash
GET /posts?include=comments
```

**개선된 응답**:
```json
{
  "id": "post-1",
  "title": "제목",
  "comments": [
    {
      "id": "comment-1",
      "content": "댓글 내용"
      // ✅ authorEmail 제외됨
      // ✅ authorIp 제외됨
    }
  ]
  // ✅ isDraft 제외됨
}
```

---

## 실전 예제

### 예제 1: 1:N 관계 (Post - Comments)

```typescript
// Prisma 스키마
model Post {
  id        String    @id @default(uuid())
  title     String
  isDraft   Boolean   @default(false)
  comments  Comment[]
  @@map("posts")
}

model Comment {
  id          String @id @default(uuid())
  content     String
  authorEmail String
  authorIp    String
  postId      String
  post        Post   @relation(fields: [postId], references: [id])
  @@map("comments")
}

// Comments 서비스
@Injectable()
export class CommentsService extends CrudBaseService<Comment> {
  constructor(prisma: PrismaService) {
    super(prisma, 'comment', {
      serialize: {
        exclude: ['authorEmail', 'authorIp'],
      },
    });
  }
}

// Posts 서비스
@Injectable()
export class PostsService extends CrudBaseService<Post> {
  constructor(prisma: PrismaService) {
    super(prisma, 'post', {
      allowedIncludes: ['comments'],
      serialize: {
        exclude: ['isDraft'],
        relations: {
          comments: 'comment',
        },
      },
    });
  }
}
```

### 예제 2: N:1 관계 (Comment - Author)

```typescript
// Prisma 스키마
model Comment {
  id       String @id @default(uuid())
  content  String
  authorId String
  author   User   @relation(fields: [authorId], references: [id])
  @@map("comments")
}

model User {
  id       String    @id @default(uuid())
  name     String
  email    String
  password String
  comments Comment[]
  @@map("users")
}

// Users 서비스
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      serialize: {
        exclude: ['password', 'email'],  // 민감 정보 제외
      },
    });
  }
}

// Comments 서비스
@Injectable()
export class CommentsService extends CrudBaseService<Comment> {
  constructor(prisma: PrismaService) {
    super(prisma, 'comment', {
      allowedIncludes: ['author'],
      serialize: {
        relations: {
          author: 'user',  // ✅ author 관계 → user 서비스 사용
        },
      },
    });
  }
}
```

**API 호출**:
```bash
GET /comments?include=author
```

**응답**:
```json
{
  "data": [
    {
      "id": "comment-1",
      "content": "댓글 내용",
      "author": {
        "id": "user-1",
        "name": "홍길동"
        // ✅ password 제외됨
        // ✅ email 제외됨
      }
    }
  ]
}
```

### 예제 3: 다중 관계

```typescript
@Injectable()
export class PostsService extends CrudBaseService<Post> {
  constructor(prisma: PrismaService) {
    super(prisma, 'post', {
      allowedIncludes: ['comments', 'author', 'tags'],

      serialize: {
        exclude: ['isDraft'],

        // ✅ 여러 관계 설정
        relations: {
          comments: 'comment',
          author: 'user',
          tags: 'tag',
        },
      },
    });
  }
}
```

---

## 주의사항

### 1. 모델명은 소문자 단수형

```typescript
// ✅ 올바른 예
relations: {
  comments: 'comment',  // 'comments' ❌
  posts: 'post',        // 'posts' ❌
  users: 'user',        // 'users' ❌
}

// ❌ 잘못된 예
relations: {
  comments: 'comments',  // 복수형 사용 금지
  posts: 'Posts',        // 대문자 사용 금지
}
```

### 2. ServiceRegistry 자동 등록

서비스는 생성 시 자동으로 레지스트리에 등록되므로 수동 등록 불필요:

```typescript
// ❌ 수동 등록 불필요
ServiceRegistry.register('comment', commentsService);

// ✅ CrudBaseService 생성자에서 자동 등록됨
```

### 3. null/undefined 안전성

관계 데이터가 null이나 undefined인 경우 안전하게 처리됩니다:

```typescript
// 관계가 null인 경우
{
  "id": "post-1",
  "comments": null  // ✅ 안전하게 유지됨
}

// 빈 배열인 경우
{
  "id": "post-2",
  "comments": []  // ✅ 빈 배열로 유지됨
}
```

### 4. 순환 참조 주의

순환 참조는 무한 루프를 유발할 수 있으므로 주의:

```typescript
// ⚠️ 순환 참조 위험
// Post → Comment → Post → Comment → ...

// 해결 방법: 한쪽 관계만 직렬화
@Injectable()
export class PostsService extends CrudBaseService<Post> {
  serialize: {
    relations: {
      comments: 'comment',  // ✅ Post → Comment만 직렬화
    }
  }
}

@Injectable()
export class CommentsService extends CrudBaseService<Comment> {
  serialize: {
    // relations 설정하지 않음 (Comment → Post 직렬화 안 함)
  }
}
```

---

## 장점

### 1. 보안 강화

✅ 민감한 정보가 관계 데이터에서도 자동 제거됨
✅ 실수로 인한 정보 노출 방지
✅ 일관된 보안 정책 적용

### 2. 코드 간결화

✅ 관계 데이터별로 별도 직렬화 로직 작성 불필요
✅ 선언적 설정만으로 재귀 직렬화 자동 적용
✅ 유지보수 용이

### 3. 성능

✅ DB에서 데이터 가져온 후 메모리에서 필터링 (빠름)
✅ 추가 쿼리 없음
✅ 오버헤드 최소화

---

## 참고 자료

- [@Crud 시스템 가이드](../src/common/crud/CLAUDE.md)
- [CrudBaseService](../src/common/crud/services/crud-base.service.ts)
- [ServiceRegistry](../src/common/crud/registry/service-registry.ts)
- [실전 예제](../examples/recursive-serialization-example.ts)

---

**마지막 업데이트**: 2025-11-09
**버전**: 1.0.0
**작성자**: Claude Code
