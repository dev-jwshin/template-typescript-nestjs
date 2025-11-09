# @CrudEntity 데코레이터 가이드

> Service 레이어 코드를 90% 줄이는 선언적 Entity 설정 시스템

## 📋 목차

- [개요](#개요)
- [문제점](#문제점)
- [해결 방법](#해결-방법)
- [사용 가이드](#사용-가이드)
- [실전 예제](#실전-예제)
- [비교](#비교)

---

## 개요

### @CrudEntity 데코레이터란?

**Entity 클래스에 CRUD 설정을 메타데이터로 저장**하여 Service 레이어에서 config 전달을 생략할 수 있게 하는 데코레이터입니다.

**핵심 개선 사항**:
- ✅ Service 레이어 코드 90% 감소 (50줄 → 5줄)
- ✅ Entity 중심 설계 (설정이 Entity에 집중)
- ✅ 중복 제거 (여러 Service에서 같은 Entity 사용 시 설정 재사용)
- ✅ 타입 안정성 (TypeScript 데코레이터)

---

## 문제점

### 기존 방식의 한계

```typescript
// ❌ 기존 방식: Service마다 설정 반복

// src/modules/users/users.service.ts
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      allowedIncludes: ['profile', 'posts'],
      allowedFilters: {
        name: ['eq', 'like'],
        email: ['eq'],
        isActive: ['eq'],
      },
      allowedSorts: ['createdAt', 'name'],
      performance: {
        query: { eagerLoad: true },
      },
      serialize: {
        exclude: ['password'],
      },
    });
  }
}

// src/modules/admin/users.admin-service.ts
@Injectable()
export class AdminUsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    // ❌ 동일한 설정 반복
    super(prisma, 'user', {
      allowedIncludes: ['profile', 'posts'],
      allowedFilters: { /* ... */ },
      allowedSorts: [/* ... */],
      performance: { /* ... */ },
      serialize: { /* ... */ },
    });
  }
}
```

**문제점**:
- 코드 중복 (여러 Service에서 같은 설정 반복)
- 유지보수 어려움 (설정 변경 시 모든 Service 수정)
- 코드 길어짐 (설정 코드가 비즈니스 로직보다 많음)

---

## 해결 방법

### @CrudEntity 데코레이터 사용

```typescript
// ✅ 새 방식: Entity에 설정 집중

// src/modules/users/user.entity.ts
import { CrudEntity } from '../../common/crud';

@CrudEntity({
  modelName: 'user',
  allowedIncludes: ['profile', 'posts'],
  allowedFilters: {
    name: ['eq', 'like'],
    email: ['eq'],
    isActive: ['eq'],
  },
  allowedSorts: ['createdAt', 'name'],
  performance: {
    query: { eagerLoad: true },
  },
  serialize: {
    exclude: ['password'],
  },
})
export class User {
  id: string;
  name: string;
  email: string;
  password: string;  // ❌ 응답에서 제외됨
}

// src/modules/users/users.service.ts
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, User);  // ✅ Entity 클래스만 전달
  }
}

// src/modules/admin/users.admin-service.ts
@Injectable()
export class AdminUsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, User);  // ✅ 동일한 설정 자동 적용
  }
}
```

**장점**:
- ✅ 코드 중복 제거 (설정을 Entity에서 한 번만 정의)
- ✅ 유지보수 용이 (설정 변경 시 Entity만 수정)
- ✅ Service 레이어 간소화 (90% 코드 감소)
- ✅ Entity 중심 설계 (데이터와 설정이 함께)

---

## 사용 가이드

### Step 1: @CrudEntity 데코레이터 import

```typescript
import { CrudEntity } from '../../common/crud';
```

### Step 2: Entity 클래스에 @CrudEntity 적용

```typescript
@CrudEntity({
  modelName: 'user',           // ✅ 필수: Prisma 모델명 (소문자 단수형)

  // 선택 사항
  allowedIncludes: ['profile', 'posts'],
  allowedFilters: {
    name: ['eq', 'like'],
    email: ['eq'],
  },
  allowedSorts: ['createdAt', 'name'],
  performance: {
    query: { eagerLoad: true },
  },
  serialize: {
    exclude: ['password'],
    relations: {
      posts: 'post',  // 재귀적 직렬화
    },
  },
})
export class User {
  // Entity 필드 정의
}
```

### Step 3: Service에서 Entity 클래스 전달

```typescript
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, User);  // ✅ Entity 클래스만 전달
  }
}
```

### Step 4 (선택): Service에서 config 오버라이드

```typescript
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, User, {
      // ✅ 부분 오버라이드 가능
      serialize: {
        exclude: ['password', 'resetToken'],  // 추가 필드 제외
      },
    });
  }
}
```

---

## 실전 예제

### 예제 1: User Entity

```typescript
// src/modules/users/user.entity.ts
import { CrudEntity } from '../../common/crud';

@CrudEntity({
  modelName: 'user',
  serialize: {
    exclude: ['password'],
  },
})
export class User {
  id: string;
  name: string;
  email: string;
  password: string;  // ❌ 응답에서 제외됨
  isActive: boolean;
  createdAt: Date;
}

// src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../common/crud';
import { PrismaService } from '../../database/prisma.service';
import { User } from './user.entity';

@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, User);  // ✅ 단 한 줄!
  }
}
```

### 예제 2: Post Entity (재귀적 직렬화)

```typescript
// src/modules/posts/post.entity.ts
import { CrudEntity } from '../../common/crud';

@CrudEntity({
  modelName: 'post',
  allowedIncludes: ['comments', 'author'],
  serialize: {
    exclude: ['isDraft'],
    relations: {
      comments: 'comment',  // ✅ 재귀적 직렬화
      author: 'user',
    },
  },
})
export class Post {
  id: string;
  title: string;
  isDraft: boolean;  // ❌ 응답에서 제외됨
  comments?: Comment[];
  author?: User;
}

// src/modules/posts/posts.service.ts
@Injectable()
export class PostsService extends CrudBaseService<Post> {
  constructor(prisma: PrismaService) {
    super(prisma, Post);  // ✅ 단 한 줄!
  }
}
```

### 예제 3: Comment Entity

```typescript
// src/modules/comments/comment.entity.ts
import { CrudEntity } from '../../common/crud';

@CrudEntity({
  modelName: 'comment',
  serialize: {
    exclude: ['authorEmail', 'authorIp'],  // ✅ 민감 정보 제외
  },
})
export class Comment {
  id: string;
  content: string;
  authorEmail: string;  // ❌ 응답에서 제외됨
  authorIp: string;     // ❌ 응답에서 제외됨
  postId: string;
}

// src/modules/comments/comments.service.ts
@Injectable()
export class CommentsService extends CrudBaseService<Comment> {
  constructor(prisma: PrismaService) {
    super(prisma, Comment);  // ✅ 단 한 줄!
  }
}
```

---

## 비교

### Before (기존 방식)

```typescript
// ❌ 50줄 코드

@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      allowedIncludes: ['profile', 'posts'],

      allowedFilters: {
        name: ['eq', 'like', 'ilike'],
        email: ['eq', 'like', 'ilike'],
        isActive: ['eq'],
        createdAt: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
      },

      allowedSorts: ['createdAt', 'updatedAt', 'name', 'email'],

      performance: {
        query: {
          eagerLoad: true,
        },
      },

      serialize: {
        exclude: ['password'],
      },
    });
  }
}
```

### After (새 방식)

```typescript
// ✅ 5줄 코드 (90% 감소)

@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, User);  // ✅ Entity 클래스만 전달
  }
}
```

---

## 설정 옵션

### CrudEntityConfig 인터페이스

```typescript
interface CrudEntityConfig {
  /**
   * Prisma 모델 이름 (소문자 단수형)
   * @required
   */
  modelName: string;

  /**
   * 허용된 Include 관계
   */
  allowedIncludes?: string[];

  /**
   * 허용된 필터
   */
  allowedFilters?: Record<string, string[]>;

  /**
   * 허용된 정렬 필드
   */
  allowedSorts?: string[];

  /**
   * 직렬화 설정
   */
  serialize?: {
    /**
     * 응답에서 제외할 필드
     */
    exclude?: string[];

    /**
     * 관계 직렬화 설정 (재귀적 직렬화)
     */
    relations?: Record<string, string>;
  };

  /**
   * 성능 최적화 설정
   */
  performance?: {
    query?: {
      /**
       * N+1 쿼리 자동 최적화
       */
      eagerLoad?: boolean;
    };
  };
}
```

---

## 주의사항

### 1. modelName은 필수

```typescript
// ❌ 에러 발생
@CrudEntity({
  serialize: { exclude: ['password'] },
})
export class User {}

// ✅ 올바른 예
@CrudEntity({
  modelName: 'user',  // 필수
  serialize: { exclude: ['password'] },
})
export class User {}
```

### 2. modelName은 소문자 단수형

```typescript
// ❌ 잘못된 예
@CrudEntity({ modelName: 'users' })      // 복수형 사용 금지
@CrudEntity({ modelName: 'User' })       // 대문자 사용 금지
@CrudEntity({ modelName: 'user_model' }) // 스네이크 케이스 금지

// ✅ 올바른 예
@CrudEntity({ modelName: 'user' })
@CrudEntity({ modelName: 'post' })
@CrudEntity({ modelName: 'comment' })
```

### 3. Entity 클래스는 실제 클래스여야 함

```typescript
// ❌ 타입 별칭은 불가능
export type User = PrismaUser;

// ✅ 실제 클래스 사용
@CrudEntity({ modelName: 'user' })
export class User {
  id: string;
  name: string;
}
```

### 4. Service에서 config 오버라이드 가능

```typescript
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, User, {
      // ✅ Entity 설정 오버라이드
      serialize: {
        exclude: ['password', 'resetToken'],  // 추가 필드 제외
      },
    });
  }
}
```

---

## 마이그레이션 가이드

### Step 1: 기존 Entity를 클래스로 변경

```typescript
// Before
export type User = PrismaUser;

// After
export class User {
  id: string;
  name: string;
  email: string;
  password: string;
}
```

### Step 2: @CrudEntity 데코레이터 추가

```typescript
import { CrudEntity } from '../../common/crud';

@CrudEntity({
  modelName: 'user',
  // Service에서 사용하던 config를 복사
  serialize: {
    exclude: ['password'],
  },
})
export class User {
  // ...
}
```

### Step 3: Service 간소화

```typescript
// Before
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      serialize: { exclude: ['password'] },
    });
  }
}

// After
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, User);  // ✅ Entity 클래스만 전달
  }
}
```

---

## 참고 자료

- [@Crud 시스템 가이드](../src/common/crud/CLAUDE.md)
- [재귀적 직렬화 가이드](./RECURSIVE_SERIALIZATION.md)
- [CrudBaseService](../src/common/crud/services/crud-base.service.ts)
- [CrudEntityConfig](../src/common/crud/types/crud-entity-config.interface.ts)
- [예제 코드](../examples/)

---

**마지막 업데이트**: 2025-11-09
**버전**: 1.0.0
**작성자**: Claude Code
