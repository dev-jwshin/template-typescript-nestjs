# 파일 기반 Serializer 시스템 가이드

> Entity별로 독립적인 `.serializer.ts` 파일을 관리하여 직렬화 로직을 중앙화하는 시스템

## 📋 목차

- [개요](#개요)
- [문제점](#문제점)
- [해결 방법](#해결-방법)
- [사용 가이드](#사용-가이드)
- [재귀적 직렬화](#재귀적-직렬화)
- [우선순위](#우선순위)
- [실전 예제](#실전-예제)
- [마이그레이션 가이드](#마이그레이션-가이드)

---

## 개요

### 파일 기반 Serializer란?

각 Entity마다 `[entity].serializer.ts` 파일을 생성하여 직렬화 규칙을 중앙에서 관리하는 시스템입니다.

**핵심 개선 사항**:
- ✅ 직렬화 로직의 중앙화 (한 곳에서 관리)
- ✅ 재귀적 관계 직렬화 자동 처리
- ✅ 타입 안전성 보장
- ✅ 테스트 가능한 구조

---

## 문제점

### 기존 방식의 한계

#### 문제 1: 직렬화 로직 분산

```typescript
// ❌ 기존 방식: 직렬화 로직이 여러 곳에 분산

// src/modules/users/users.service.ts
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      serialize: {
        exclude: ['password'],
      },
    });
  }
}

// src/modules/users/admin/users.controller.ts
@Crud({
  serialize: {
    exclude: ['password'],  // 중복 설정
  },
})
export class AdminUsersController {}

// src/modules/users/api/users.controller.ts
@Crud({
  serialize: {
    exclude: ['password', 'email'],  // 또 다른 설정
  },
})
export class UsersController {}
```

**문제점**:
- 직렬화 규칙이 Service, Controller 등 여러 곳에 분산
- 설정 변경 시 모든 파일 수정 필요
- 일관성 유지 어려움

#### 문제 2: 중첩 관계 직렬화의 복잡성

```typescript
// ❌ 기존 방식: 관계 데이터 직렬화 수동 처리

// User를 include하면 password가 그대로 노출됨
const user = await prisma.user.findUnique({
  where: { id: '123' },
  include: { profile: true },
});

// {
//   id: '123',
//   name: 'John',
//   password: 'hashed...',  // ❌ 노출됨!
//   profile: {
//     phone: '010-1234-5678',  // ❌ 민감 정보 노출!
//   }
// }
```

---

## 해결 방법

### 파일 기반 Serializer 사용

```typescript
// ✅ 새 방식: [entity].serializer.ts로 중앙 관리

// src/modules/users/user.serializer.ts
export class UserSerializer extends BaseSerializer<User> {
  protected excludeFields = ['password'];

  protected relations = {
    profile: 'profile',  // ProfileSerializer 자동 적용
  };
}

// src/modules/profiles/profile.serializer.ts
export class ProfileSerializer extends BaseSerializer<Profile> {
  protected excludeFields = ['phone'];  // 민감 정보 제외

  protected relations = {
    user: 'user',  // UserSerializer 자동 적용
  };
}

// ✅ 모듈에서 Serializer 등록
@Module({
  // ...
})
export class UsersModule implements OnModuleInit {
  onModuleInit() {
    SerializerRegistry.register('user', new UserSerializer());
  }
}
```

**장점**:
- ✅ 직렬화 로직 중앙화 (한 파일에서 관리)
- ✅ 재귀적 관계 직렬화 자동 처리
- ✅ 타입 안전성 보장
- ✅ 테스트 용이성

---

## 사용 가이드

### Step 1: BaseSerializer 상속

```typescript
// src/modules/users/user.serializer.ts
import { BaseSerializer } from '../../common/crud/serializers/base.serializer';
import { User } from './user.entity';

export class UserSerializer extends BaseSerializer<User> {
  /**
   * 응답에서 제외할 필드
   */
  protected excludeFields = ['password', 'resetToken'];

  /**
   * 관계 직렬화 매핑
   * 키: 관계 필드명 (Entity의 프로퍼티명)
   * 값: 관계 모델명 (Prisma 모델명, 소문자 단수형)
   */
  protected relations = {
    profile: 'profile',  // User.profile → ProfileSerializer
    posts: 'post',       // User.posts → PostSerializer
  };

  /**
   * 커스텀 변환 함수 (선택사항)
   */
  protected transform(data: Partial<User>): Partial<User> {
    return {
      ...data,
      // 예: 추가 필드 계산
      fullName: `${data.firstName} ${data.lastName}`,
    };
  }
}
```

### Step 2: SerializerRegistry에 등록

```typescript
// src/modules/users/users.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { SerializerRegistry } from '../../common/crud/serializers/serializer-registry';
import { UserSerializer } from './user.serializer';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  /**
   * 모듈 초기화 시 Serializer 등록
   */
  onModuleInit() {
    SerializerRegistry.register('user', new UserSerializer());
  }
}
```

### Step 3: 자동 적용 확인

```typescript
// CrudBaseService가 자동으로 파일 기반 Serializer 사용

// API 호출
GET /api/users/123?include=profile

// ✅ 자동 직렬화 결과
{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com",
  // "password" ✅ 자동 제외됨 (UserSerializer)
  "profile": {
    "id": "456",
    "bio": "Software Engineer",
    // "phone" ✅ 자동 제외됨 (ProfileSerializer)
  }
}
```

---

## 재귀적 직렬화

### 동작 원리

```typescript
// User → Profile → User (순환 참조 처리)

// user.serializer.ts
export class UserSerializer extends BaseSerializer<User> {
  protected excludeFields = ['password'];
  protected relations = {
    profile: 'profile',  // ProfileSerializer 사용
  };
}

// profile.serializer.ts
export class ProfileSerializer extends BaseSerializer<Profile> {
  protected excludeFields = ['phone'];
  protected relations = {
    user: 'user',  // UserSerializer 사용 (순환 참조)
  };
}

// ✅ 재귀적 직렬화 자동 처리
GET /api/users/123?include=profile

{
  "id": "123",
  "name": "John",
  // "password" ✅ 제외
  "profile": {
    "id": "456",
    "bio": "Engineer",
    // "phone" ✅ 제외
    "user": {
      "id": "123",
      "name": "John",
      // "password" ✅ 제외 (재귀 직렬화)
    }
  }
}
```

---

## 우선순위

### Serializer 우선순위

CrudBaseService는 다음 우선순위로 Serializer를 선택합니다:

1. **파일 기반 Serializer** (SerializerRegistry에서 조회)
2. **Config 기반 직렬화** (기존 방식)

```typescript
// CrudBaseService.serialize() 내부 로직

// 1순위: 파일 기반 Serializer
const fileBasedSerializer = SerializerRegistry.get(this.modelName);
if (fileBasedSerializer) {
  return fileBasedSerializer.serialize(entity, SerializerRegistry.getAll());
}

// 2순위: Config 기반 직렬화
if (this.config.serialize?.exclude) {
  // 기존 방식 처리
}
```

### 장점

- ✅ 기존 코드와 호환성 유지
- ✅ 점진적 마이그레이션 가능
- ✅ 파일 기반 Serializer 우선 사용

---

## 실전 예제

### 예제 1: 기본 User Serializer

```typescript
// src/modules/users/user.entity.ts
export type User = PrismaUser;

// src/modules/users/user.serializer.ts
export class UserSerializer extends BaseSerializer<User> {
  protected excludeFields = ['password'];

  protected relations = {
    profile: 'profile',
  };
}

// src/modules/users/users.module.ts
@Module({
  // ...
})
export class UsersModule implements OnModuleInit {
  onModuleInit() {
    SerializerRegistry.register('user', new UserSerializer());
  }
}
```

### 예제 2: Profile Serializer (재귀)

```typescript
// src/modules/profiles/profile.entity.ts
export type Profile = PrismaProfile;

// src/modules/profiles/profile.serializer.ts
export class ProfileSerializer extends BaseSerializer<Profile> {
  protected excludeFields = ['phone'];

  protected relations = {
    user: 'user',  // UserSerializer 사용 (재귀)
  };
}

// src/modules/profiles/profiles.module.ts
@Module({
  // ...
})
export class ProfilesModule implements OnModuleInit {
  onModuleInit() {
    SerializerRegistry.register('profile', new ProfileSerializer());
  }
}
```

### 예제 3: 커스텀 변환 함수

```typescript
// src/modules/users/user.serializer.ts
export class UserSerializer extends BaseSerializer<User> {
  protected excludeFields = ['password'];

  protected relations = {
    profile: 'profile',
  };

  /**
   * 커스텀 변환 함수
   */
  protected transform(data: Partial<User>): Partial<User> {
    return {
      ...data,
      // 추가 필드 계산
      fullName: `${data.firstName} ${data.lastName}`,
      age: this.calculateAge(data.birthDate),

      // URL 변환
      avatarUrl: data.avatar
        ? `https://cdn.example.com/${data.avatar}`
        : null,
    };
  }

  private calculateAge(birthDate?: Date): number | undefined {
    if (!birthDate) return undefined;
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  }
}
```

---

## 마이그레이션 가이드

### Step 1: Entity 파일 확인

```typescript
// src/modules/users/user.entity.ts
import { User as PrismaUser } from '@prisma/client';

export type User = PrismaUser;
```

### Step 2: Serializer 파일 생성

```typescript
// src/modules/users/user.serializer.ts
import { BaseSerializer } from '../../common/crud/serializers/base.serializer';
import { User } from './user.entity';

export class UserSerializer extends BaseSerializer<User> {
  // 기존 serialize.exclude 복사
  protected excludeFields = ['password'];

  // 기존 serialize.relations 복사
  protected relations = {
    profile: 'profile',
  };
}
```

### Step 3: 모듈에 등록

```typescript
// src/modules/users/users.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { SerializerRegistry } from '../../common/crud/serializers/serializer-registry';
import { UserSerializer } from './user.serializer';

@Module({
  // ...
})
export class UsersModule implements OnModuleInit {
  onModuleInit() {
    SerializerRegistry.register('user', new UserSerializer());
  }
}
```

### Step 4: Service 간소화 (선택사항)

```typescript
// Before
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      serialize: {
        exclude: ['password'],
      },
    });
  }
}

// After (serialize 설정 제거)
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      // serialize 설정 제거 (파일 기반 Serializer 사용)
      allowedIncludes: ['profile', 'posts'],
      allowedFilters: { name: ['eq', 'like'] },
    });
  }
}
```

### Step 5: 테스트 확인

```bash
# API 테스트
GET /api/users/123?include=profile

# 응답 확인
{
  "id": "123",
  "name": "John",
  // "password" ✅ 제외 확인
  "profile": {
    "id": "456",
    "bio": "Engineer",
    // "phone" ✅ 제외 확인
  }
}
```

---

## 참고 자료

### 관련 문서
- [CRUD 시스템 가이드](../src/common/crud/CLAUDE.md)
- [재귀적 직렬화 가이드](./RECURSIVE_SERIALIZATION.md)

### 핵심 파일 위치
- BaseSerializer: `src/common/crud/serializers/base.serializer.ts`
- SerializerRegistry: `src/common/crud/serializers/serializer-registry.ts`
- CrudBaseService: `src/common/crud/services/crud-base.service.ts`

---

**마지막 업데이트**: 2025-11-09
**버전**: 1.0.0
**작성자**: Claude Code
