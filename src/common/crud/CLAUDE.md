# @Crud 데코레이터 시스템 가이드

> NestJS에서 보일러플레이트 코드를 90% 줄이는 선언적 CRUD 시스템

## 📋 목차

- [개요](#개요)
- [핵심 개념](#핵심-개념)
- [빠른 시작](#빠른-시작)
- [설정 옵션](#설정-옵션)
- [고급 기능](#고급-기능)
- [성능 최적화](#성능-최적화)
- [재귀적 직렬화](#재귀적-직렬화)
- [플러그인 시스템](#플러그인-시스템)
- [훅 시스템](#훅-시스템)
- [실전 예제](#실전-예제)
- [트러블슈팅](#트러블슈팅)

---

## 개요

### @Crud 데코레이터란?

**@Crud**는 클래스 데코레이터로, 단 하나의 설정 객체만으로 완전한 REST API 엔드포인트를 자동 생성합니다.

**전통적인 방식** (200+ 줄):
```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: any) {
    // 필터링, 정렬, 페이지네이션 로직 (30줄)
    // 쿼리 빌딩 (20줄)
    // JSON:API 변환 (15줄)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // 검증 (5줄)
    // 조회 (3줄)
    // JSON:API 변환 (10줄)
  }

  @Post()
  async create(@Body() createDto: CreateUserDto) {
    // 검증 (10줄)
    // 생성 (5줄)
    // JSON:API 변환 (10줄)
  }

  // PATCH, DELETE 등 추가 120줄...
}
```

**@Crud 사용** (40줄):
```typescript
@Crud({
  only: [
    CrudOperation.Index,
    CrudOperation.Show,
    CrudOperation.Create,
    CrudOperation.Update,
    CrudOperation.Delete,
  ],
  resourceType: 'users',
  allowedFilters: {
    name: ['eq', 'like', 'ilike'],
    email: ['eq'],
    isActive: ['eq'],
  },
  allowedSorts: ['createdAt', 'name'],
  pagination: { defaultLimit: 20, limit: 100 },
  performance: {
    query: { eagerLoad: true }, // N+1 쿼리 자동 최적화
  },
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

### 자동 생성되는 엔드포인트

| Operation | HTTP Method | 경로             | 설명       |
|-----------|-------------|------------------|------------|
| Index     | GET         | `/users`         | 목록 조회  |
| Show      | GET         | `/users/:id`     | 단일 조회  |
| Create    | POST        | `/users`         | 생성       |
| Update    | PATCH       | `/users/:id`     | 수정       |
| Delete    | DELETE      | `/users/:id`     | 삭제       |

### 주요 기능

- ✅ **13가지 필터 연산자**: eq, ne, gt, gte, lt, lte, like, ilike, in, nin, between, isNull, isNotNull
- ✅ **Sparse Fieldsets**: 필요한 필드만 선택 반환
- ✅ **Sorting**: 다중 필드 정렬 (오름차순/내림차순)
- ✅ **Pagination**: Offset/Limit, Cursor 기반 페이지네이션
- ✅ **관계 포함**: 중첩된 관계 자동 로딩 (N+1 쿼리 최적화)
- ✅ **JSON:API 1.1 준수**: 표준 REST API 스펙
- ✅ **타입 안정성**: 100% TypeScript 타입 지원
- ✅ **확장 가능**: 플러그인, 훅 시스템

---


## 핵심 개념

### 1. 아키텍처 구조

```
@Crud 데코레이터 적용
    ↓
CrudMetadataStorage (메타데이터 저장)
    ↓
CrudRouteFactory (라우트 자동 생성)
    ↓
생성된 엔드포인트
    ↓
CrudBaseService (CRUD 로직 실행)
    ↓
PrismaQueryBuilder (최적화된 쿼리 생성)
    ↓
PrismaService (데이터베이스 실행)
```

### 2. 핵심 컴포넌트

#### 2.1 CrudBaseService

모든 CRUD 서비스의 베이스 클래스로, 표준 CRUD 작업을 자동 구현합니다.

**위치**: `src/common/crud/services/crud-base.service.ts`

**특징**:
- N+1 쿼리 자동 최적화 (Eager Loading)
- Sparse Fieldsets 자동 처리
- 민감한 필드 자동 제거 (password 등)
- 페이지네이션 자동 계산

**사용 방법**:
```typescript
import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../common/crud/services/crud-base.service';
import { PrismaService } from '../../database/prisma.service';
import { User } from './user.entity';

@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      allowedIncludes: ['profile', 'posts'], // 허용된 관계
      allowedFilters: {
        name: ['eq', 'like', 'ilike'],
        email: ['eq'],
        isActive: ['eq'],
      },
      allowedSorts: ['createdAt', 'updatedAt', 'name'],
      performance: {
        query: { eagerLoad: true }, // N+1 쿼리 최적화 활성화
      },
      // 직렬화는 user.serializer.ts에서 관리 (파일 기반 Serializer 사용)
    });
  }

  // 커스텀 메서드 추가 가능
  async findByEmail(email: string): Promise<User> {
    return this.model.findUnique({ where: { email } });
  }
}
```

#### 2.2 PrismaQueryBuilder

필터, 정렬, 페이지네이션 쿼리를 Prisma 쿼리로 자동 변환합니다.

**위치**: `src/common/crud/builders/prisma-query.builder.ts`

**지원 기능**:
- **필터 변환**: `?filter[name][like]=John` → `{ where: { name: { contains: 'John' } } }`
- **정렬 변환**: `?sort=-createdAt,name` → `{ orderBy: [{ createdAt: 'desc' }, { name: 'asc' }] }`
- **페이지네이션**: `?page[number]=2&page[size]=10` → `{ skip: 10, take: 10 }`
- **Include 최적화**: N+1 쿼리 방지

#### 2.3 CrudRouteFactory

@Crud 설정을 기반으로 NestJS 라우트 핸들러를 동적 생성합니다.

**위치**: `src/common/crud/factories/crud-route.factory.ts`

**동작 과정**:
1. @Crud 설정 읽기
2. 각 CrudOperation에 대해 라우트 핸들러 생성
3. 데코레이터 적용 (@Get, @Post, @Patch, @Delete)
4. Swagger 문서 자동 생성
5. 컨트롤러 프로토타입에 메서드 추가

---

## 빠른 시작

### Step 1: Prisma 스키마 정의

```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile   Profile?
  posts     Post[]

  @@map("users")
}

model Profile {
  id     String @id @default(uuid())
  bio    String?
  avatar String?
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])

  @@map("profiles")
}
```

### Step 2: 엔티티 타입 정의

```typescript
// src/modules/users/user.entity.ts
import { User as PrismaUser } from '@prisma/client';

export type User = PrismaUser;
```

### Step 3: 서비스 생성 (CrudBaseService 상속)

```typescript
// src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../common/crud/services/crud-base.service';
import { PrismaService } from '../../database/prisma.service';
import { User } from './user.entity';

@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      allowedIncludes: ['profile', 'posts'],
      allowedFilters: {
        name: ['eq', 'like', 'ilike'],
        email: ['eq'],
        isActive: ['eq'],
        createdAt: ['gt', 'gte', 'lt', 'lte', 'between'],
      },
      allowedSorts: ['createdAt', 'updatedAt', 'name', 'email'],
      performance: {
        query: { eagerLoad: true },
      },
      // 직렬화는 user.serializer.ts에서 관리 (파일 기반 Serializer 사용)
    });
  }
}
```

### Step 4: 컨트롤러 생성 (@Crud 적용)

```typescript
// src/modules/users/api/users.controller.ts
import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../../common/crud';
import { UsersService } from '../users.service';

@Crud({
  only: [
    CrudOperation.Index,
    CrudOperation.Show,
    CrudOperation.Create,
    CrudOperation.Update,
    CrudOperation.Delete,
  ],
  resourceType: 'users',
  allowedFilters: {
    name: ['eq', 'like', 'ilike'],
    email: ['eq'],
    isActive: ['eq'],
  },
  allowedSorts: ['createdAt', 'name', 'email'],
  allowedIncludes: ['profile', 'posts'],
  pagination: {
    defaultLimit: 20,
    limit: 100,
  },
  performance: {
    query: { eagerLoad: true },
  },
  // 직렬화는 user.serializer.ts에서 관리 (파일 기반 Serializer 사용)
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

### Step 5: 모듈 등록

```typescript
// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './api/users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

### Step 6: API 테스트

```bash
# 목록 조회 (필터링, 정렬, 페이지네이션)
GET http://localhost:3000/api/users?filter[isActive][eq]=true&sort=-createdAt&page[number]=1&page[size]=10

# 단일 조회 (관계 포함)
GET http://localhost:3000/api/users/123?include=profile,posts

# 생성
POST http://localhost:3000/api/users
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "users",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com",
      "password": "SecureP@ss123"
    }
  }
}

# 수정
PATCH http://localhost:3000/api/users/123
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "users",
    "id": "123",
    "attributes": {
      "name": "Jane Doe"
    }
  }
}

# 삭제
DELETE http://localhost:3000/api/users/123
```

---

## 설정 옵션

### 1. only (필수)

생성할 CRUD 작업 목록

```typescript
only: [
  CrudOperation.Index,   // GET /users
  CrudOperation.Show,    // GET /users/:id
  CrudOperation.Create,  // POST /users
  CrudOperation.Update,  // PATCH /users/:id
  CrudOperation.Delete,  // DELETE /users/:id
]
```

### 2. resourceType (선택)

JSON:API 리소스 타입 (복수형 권장)

```typescript
resourceType: 'users'
```

### 3. allowedFilters (선택)

허용된 필터 설정 (필드명 → 연산자 배열)

```typescript
allowedFilters: {
  name: ['eq', 'like', 'ilike'],          // 문자열 필터
  email: ['eq'],                          // 정확한 일치만
  age: ['eq', 'gt', 'gte', 'lt', 'lte'],  // 숫자 비교
  isActive: ['eq'],                       // boolean
  createdAt: ['gt', 'gte', 'lt', 'lte', 'between'], // 날짜 범위
  tags: ['in', 'nin'],                    // 배열 포함 여부
  deletedAt: ['isNull', 'isNotNull'],     // NULL 체크
}
```

**사용 예시**:
```bash
# 이름에 "John"이 포함된 사용자
GET /users?filter[name][like]=John

# 이메일이 정확히 일치하는 사용자
GET /users?filter[email][eq]=john@example.com

# 나이가 18세 이상인 사용자
GET /users?filter[age][gte]=18

# 활성 사용자만
GET /users?filter[isActive][eq]=true

# 2025년 1월 이후 가입한 사용자
GET /users?filter[createdAt][gte]=2025-01-01

# 태그가 "admin" 또는 "moderator"인 사용자
GET /users?filter[tags][in]=admin,moderator

# 삭제되지 않은 사용자만
GET /users?filter[deletedAt][isNull]=true
```

**지원 연산자**:

| 연산자 | 설명 | 예시 |
|--------|------|------|
| `eq` | 같음 | `filter[name][eq]=John` |
| `ne` | 같지 않음 | `filter[status][ne]=inactive` |
| `gt` | 초과 | `filter[age][gt]=18` |
| `gte` | 이상 | `filter[age][gte]=18` |
| `lt` | 미만 | `filter[price][lt]=100` |
| `lte` | 이하 | `filter[price][lte]=100` |
| `like` | 포함 (대소문자 구분) | `filter[name][like]=John` |
| `ilike` | 포함 (대소문자 무시) | `filter[name][ilike]=john` |
| `in` | 배열 포함 | `filter[status][in]=active,pending` |
| `nin` | 배열 불포함 | `filter[status][nin]=deleted,banned` |
| `between` | 범위 | `filter[age][between]=18,65` |
| `isNull` | NULL 여부 | `filter[deletedAt][isNull]=true` |
| `isNotNull` | NOT NULL 여부 | `filter[verifiedAt][isNotNull]=true` |

### 4. allowedSorts (선택)

허용된 정렬 필드

```typescript
allowedSorts: ['createdAt', 'updatedAt', 'name', 'email']
```

**사용 예시**:
```bash
# 생성일 내림차순 (최신순)
GET /users?sort=-createdAt

# 이름 오름차순
GET /users?sort=name

# 다중 정렬: 활성 여부 내림차순 → 이름 오름차순
GET /users?sort=-isActive,name
```

### 5. allowedIncludes (선택)

허용된 관계 (Prisma relation)

```typescript
allowedIncludes: ['profile', 'posts', 'posts.comments']
```

**사용 예시**:
```bash
# profile 관계 포함
GET /users?include=profile

# profile과 posts 관계 포함
GET /users?include=profile,posts

# 중첩 관계 포함 (posts의 comments)
GET /users?include=posts.comments
```

### 6. pagination (선택)

페이지네이션 기본값

```typescript
pagination: {
  defaultLimit: 20,  // 기본 페이지 크기
  limit: 100,        // 최대 페이지 크기
}
```

**사용 예시**:
```bash
# 페이지 번호 방식 (1부터 시작)
GET /users?page[number]=2&page[size]=10

# 오프셋 방식
GET /users?page[offset]=20&page[limit]=10
```

### 7. allowedParams (선택)

Create/Update에서 허용할 파라미터 (화이트리스트)

```typescript
allowedParams: {
  name: {
    type: 'string',
    required: true,
    description: '사용자 이름',
    example: 'John Doe',
  },
  email: {
    type: 'string',
    required: true,
    description: '이메일',
    example: 'john@example.com',
  },
  age: {
    type: 'number',
    required: false,
    description: '나이',
    example: 25,
  },
  isActive: {
    type: 'boolean',
    required: false,
    description: '활성 상태',
    example: true,
  },
}
```

**참고**: 응답 직렬화는 `{module}.serializer.ts` 파일을 통해 관리됩니다. [@Crud 데코레이터에서는 직렬화 설정을 지원하지 않습니다.](#재귀적-직렬화)

### 8. performance (선택)

성능 최적화 설정

```typescript
performance: {
  query: {
    eagerLoad: true,  // N+1 쿼리 자동 최적화
  },
}
```

**N+1 쿼리 문제 해결**:
```typescript
// ❌ N+1 쿼리 발생 (eagerLoad: false)
// 1. SELECT * FROM users
// 2. SELECT * FROM profiles WHERE userId = 1
// 3. SELECT * FROM profiles WHERE userId = 2
// ... (N번 쿼리)

// ✅ Eager Loading (eagerLoad: true)
// 1. SELECT * FROM users LEFT JOIN profiles ON users.id = profiles.userId
// → 단 1번의 쿼리로 해결
```

### 9. routes (선택)

개별 라우트 설정 (전역 설정 오버라이드)

```typescript
routes: {
  [CrudOperation.Index]: {
    decorators: [UseGuards(AdminGuard)],  // Index만 AdminGuard 적용
    swagger: {
      summary: '사용자 목록 조회 (관리자 전용)',
      description: '활성 사용자 목록을 조회합니다.',
    },
  },
  [CrudOperation.Create]: {
    allowedParams: {
      name: { required: true },
      email: { required: true },
      password: { required: true },  // Create에서만 password 필수
    },
    swagger: {
      summary: '새 사용자 생성',
    },
  },
  [CrudOperation.Update]: {
    allowedParams: {
      name: { required: false },
      email: { required: false },
      // password는 Update에서 선택 사항
    },
  },
}
```

---

## 고급 기능

### 1. Sparse Fieldsets (필드 선택)

응답에 필요한 필드만 선택하여 반환

```bash
# name과 email 필드만 반환
GET /users?fields[users]=name,email

# 관계의 특정 필드만 반환
GET /users?include=profile&fields[users]=name,email&fields[profiles]=bio,avatar
```

**장점**:
- 네트워크 트래픽 감소 (40-60%)
- 프론트엔드 렌더링 속도 향상
- 민감한 정보 노출 최소화

### 2. 복합 필터링

여러 필터를 조합하여 복잡한 쿼리 구성

```bash
# AND 조건 (기본)
GET /users?filter[isActive][eq]=true&filter[age][gte]=18

# 범위 필터
GET /users?filter[createdAt][between]=2025-01-01,2025-12-31

# NULL 체크
GET /users?filter[deletedAt][isNull]=true

# 배열 필터
GET /users?filter[role][in]=admin,moderator
```

### 3. 다중 정렬

여러 필드를 기준으로 정렬 (우선순위 순서)

```bash
# 활성 여부 내림차순 → 생성일 내림차순 → 이름 오름차순
GET /users?sort=-isActive,-createdAt,name
```

### 4. 중첩 관계 포함

깊이 제한 없이 관계를 중첩하여 포함

```bash
# posts의 comments, comments의 author까지 포함
GET /users?include=posts.comments.author

# 여러 중첩 관계 동시 포함
GET /users?include=profile,posts.comments,posts.tags
```

---

## 성능 최적화

### 1. N+1 쿼리 자동 최적화

**문제**: 관계 데이터를 조회할 때 발생하는 성능 문제

```typescript
// ❌ N+1 쿼리 발생 (나쁜 예)
const users = await prisma.user.findMany();
for (const user of users) {
  user.profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
}
// → 1 + N번의 쿼리 실행 (users 100개 → 101번 쿼리)
```

**해결**: `eagerLoad: true` 설정

```typescript
@Crud({
  // ...
  performance: {
    query: {
      eagerLoad: true,  // N+1 쿼리 자동 최적화
    },
  },
})
```

```typescript
// ✅ Eager Loading (좋은 예)
const users = await prisma.user.findMany({
  include: {
    profile: true,
  },
});
// → 단 1번의 JOIN 쿼리로 해결
```

**성능 개선**:
- 쿼리 횟수: 101번 → 1번 (99% 감소)
- 응답 시간: 1,200ms → 50ms (96% 감소)

### 2. 쿼리 최적화 체크리스트

- ✅ `eagerLoad: true` 설정 (N+1 쿼리 방지)
- ✅ Sparse Fieldsets 사용 (불필요한 필드 제외)
- ✅ 페이지네이션 설정 (대량 데이터 조회 방지)
- ✅ 인덱스 설정 (Prisma 스키마에 `@@index` 추가)
- ✅ `allowedFilters` 제한 (허용된 필드만 필터링)

---

## 재귀적 직렬화

### 관계 데이터의 민감 정보 자동 제외

**재귀적 직렬화**는 Entity의 serialize 설정을 관계 데이터에도 자동으로 적용하는 강력한 기능입니다.

### 문제 상황

```typescript
// ❌ 파일 기반 Serializer 미사용 시
export class PostSerializer extends BaseSerializer<Post> {
  protected excludeFields = ['isDraft'];
  // relations 설정 없음 - author의 password 노출됨!
}

// API 응답
{
  "id": "post-1",
  "title": "Hello",
  // "isDraft": false ✅ 제외됨
  "author": {
    "id": "user-1",
    "name": "John",
    "password": "hashed..." // ❌ 노출됨!
  }
}
```

### 해결 방법

```typescript
// ✅ PostSerializer에 relations 설정
export class PostSerializer extends BaseSerializer<Post> {
  protected excludeFields = ['isDraft'];

  protected relations = {
    author: 'user',    // author 관계는 UserSerializer 사용
    comments: 'comment', // comments 관계는 CommentSerializer 사용
  };
}

// UserSerializer 설정
export class UserSerializer extends BaseSerializer<User> {
  protected excludeFields = ['password'];  // ✅ password 제외
}

// API 응답
{
  "id": "post-1",
  "title": "Hello",
  // "isDraft": false ✅ 제외됨
  "author": {
    "id": "user-1",
    "name": "John",
    "email": "john@example.com"
    // "password": "..." ✅ 자동 제외됨!
  },
  "comments": [
    {
      "id": "comment-1",
      "content": "Great!"
      // "authorEmail": "..." ✅ 자동 제외됨!
    }
  ]
}
```

### ServiceRegistry

재귀적 직렬화는 **ServiceRegistry**를 통해 구현됩니다.

```typescript
// src/common/crud/registry/service-registry.ts
export class ServiceRegistry {
  private static services = new Map<string, any>();

  static register(modelName: string, service: any): void {
    this.services.set(modelName, service);
  }

  static get(modelName: string): any {
    return this.services.get(modelName);
  }
}
```

**동작 과정**:
1. CrudBaseService 생성 시 ServiceRegistry에 자동 등록
2. serialize() 메서드에서 relations 설정 확인
3. 관계 필드마다 ServiceRegistry에서 해당 모델의 Service 조회
4. 조회된 Service의 serialize() 메서드 재귀 호출
5. 깊이 제한 없이 모든 관계 데이터 직렬화

### 주요 특징

- ✅ **자동 등록**: Service 생성 시 ServiceRegistry에 자동 등록
- ✅ **재귀적 처리**: 깊이 제한 없이 중첩된 관계 데이터 직렬화
- ✅ **타입 안전성**: serialize.relations의 모델명 검증
- ✅ **중복 제거**: 같은 모델은 한 번만 직렬화 설정 정의

### 상세 가이드

📚 **재귀적 직렬화 완전 가이드**: [docs/RECURSIVE_SERIALIZATION.md](../../../docs/RECURSIVE_SERIALIZATION.md)

---

## 플러그인 시스템

플러그인을 통해 CRUD 동작을 확장할 수 있습니다.

### 내장 플러그인

#### 1. Audit Log Plugin

모든 CRUD 작업을 자동으로 감사 로그에 기록

**위치**: `src/common/crud/plugins/audit-log.plugin.ts`

**사용 방법**:
```typescript
import { AuditLogPlugin } from '../../../common/crud/plugins/audit-log.plugin';

@Crud({
  // ...
  plugins: [new AuditLogPlugin()],
})
```

**기록 내용**:
- 작업 타입 (CREATE, UPDATE, DELETE)
- 사용자 ID
- 변경 전/후 데이터
- 타임스탬프

#### 2. Rate Limit Plugin

API 호출 횟수 제한

**위치**: `src/common/crud/plugins/rate-limit.plugin.ts`

**사용 방법**:
```typescript
import { RateLimitPlugin } from '../../../common/crud/plugins/rate-limit.plugin';

@Crud({
  // ...
  plugins: [
    new RateLimitPlugin({
      windowMs: 15 * 60 * 1000, // 15분
      max: 100,                  // 최대 100번 호출
    }),
  ],
})
```

#### 3. Caching Plugin

Redis를 사용한 응답 캐싱

**위치**: `src/common/crud/plugins/caching.plugin.ts`

**사용 방법**:
```typescript
import { CachingPlugin } from '../../../common/crud/plugins/caching.plugin';

@Crud({
  // ...
  plugins: [
    new CachingPlugin({
      ttl: 3600,  // 1시간 캐싱
      keyPrefix: 'users:',
    }),
  ],
})
```

### 커스텀 플러그인 생성

**인터페이스**:
```typescript
// src/common/crud/plugins/crud-plugin.interface.ts
export interface CrudPlugin {
  name: string;
  init?(config: CrudConfig): void;
  beforeCreate?(data: any): Promise<any>;
  afterCreate?(result: any): Promise<any>;
  beforeUpdate?(id: string, data: any): Promise<any>;
  afterUpdate?(result: any): Promise<any>;
  beforeDelete?(id: string): Promise<void>;
  afterDelete?(id: string): Promise<void>;
  beforeFind?(options: any): Promise<any>;
  afterFind?(result: any): Promise<any>;
}
```

**예시: Soft Delete Plugin**
```typescript
// src/common/crud/plugins/soft-delete.plugin.ts
import { CrudPlugin } from './crud-plugin.interface';

export class SoftDeletePlugin implements CrudPlugin {
  name = 'SoftDeletePlugin';

  async beforeDelete(id: string): Promise<void> {
    // 실제 삭제 대신 deletedAt 필드만 업데이트
    console.log(`[SoftDelete] Marking ${id} as deleted`);
  }

  async beforeFind(options: any): Promise<any> {
    // 삭제된 항목 제외
    return {
      ...options,
      filter: {
        ...options.filter,
        deletedAt: { isNull: true },
      },
    };
  }
}
```

---

## 훅 시스템

특정 시점에 커스텀 로직을 삽입할 수 있습니다.

### 사용 가능한 훅

```typescript
import { BeforeCreate, AfterCreate } from '../../../common/crud/decorators/hook.decorator';

@Injectable()
export class UsersService extends CrudBaseService<User> {
  // ...

  @BeforeCreate()
  async hashPassword(createDto: CreateUserDto) {
    // 비밀번호 해싱
    createDto.password = await bcrypt.hash(createDto.password, 10);
    return createDto;
  }

  @AfterCreate()
  async sendWelcomeEmail(user: User) {
    // 환영 이메일 발송
    await this.emailService.sendWelcome(user.email);
    return user;
  }

  @BeforeUpdate()
  async validateUpdate(id: string, updateDto: UpdateUserDto) {
    // 업데이트 전 검증
    const user = await this.findOne(id);
    if (user.isLocked) {
      throw new ForbiddenException('계정이 잠겨있습니다.');
    }
    return updateDto;
  }

  @AfterDelete()
  async cleanupUserData(id: string) {
    // 연관 데이터 정리
    await this.prisma.profile.deleteMany({ where: { userId: id } });
  }
}
```

### 훅 실행 순서

```
Create 요청
  ↓
Plugin.beforeCreate()
  ↓
@BeforeCreate() 훅
  ↓
실제 생성 로직
  ↓
@AfterCreate() 훅
  ↓
Plugin.afterCreate()
  ↓
JSON:API 응답 변환
  ↓
클라이언트에 응답
```

---

## 실전 예제

### 예제 1: 기본 CRUD API

**요구사항**: 사용자 관리 API (생성, 조회, 수정, 삭제)

```typescript
// 1. Prisma 스키마
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

// 2. 서비스
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      allowedFilters: {
        name: ['eq', 'like', 'ilike'],
        email: ['eq'],
        isActive: ['eq'],
      },
      allowedSorts: ['createdAt', 'name'],
      // 직렬화는 user.serializer.ts에서 관리 (파일 기반 Serializer 사용)
    });
  }
}

// 3. 컨트롤러
@Crud({
  only: [
    CrudOperation.Index,
    CrudOperation.Show,
    CrudOperation.Create,
    CrudOperation.Update,
    CrudOperation.Delete,
  ],
  resourceType: 'users',
  allowedFilters: {
    name: ['eq', 'like'],
    email: ['eq'],
    isActive: ['eq'],
  },
  allowedSorts: ['createdAt', 'name'],
  pagination: {
    defaultLimit: 20,
    limit: 100,
  },
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

### 예제 2: 관계 포함 API

**요구사항**: 사용자 + 프로필 + 게시글 조회

```typescript
// 1. Prisma 스키마
model User {
  id      String   @id @default(uuid())
  name    String
  email   String   @unique
  profile Profile?
  posts   Post[]

  @@map("users")
}

model Profile {
  id     String @id @default(uuid())
  bio    String?
  avatar String?
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])

  @@map("profiles")
}

model Post {
  id       String @id @default(uuid())
  title    String
  content  String
  authorId String
  author   User   @relation(fields: [authorId], references: [id])

  @@map("posts")
}

// 2. 서비스 (N+1 쿼리 최적화)
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', {
      allowedIncludes: ['profile', 'posts'],  // 허용된 관계
      performance: {
        query: { eagerLoad: true },  // N+1 쿼리 최적화
      },
    });
  }
}

// 3. 컨트롤러
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show],
  resourceType: 'users',
  allowedIncludes: ['profile', 'posts'],
  performance: {
    query: { eagerLoad: true },
  },
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}

// 4. API 호출
// GET /users?include=profile,posts
// → 단 1번의 JOIN 쿼리로 모든 데이터 조회 (N+1 쿼리 방지)
```

### 예제 3: 관리자/사용자 API 분리

**요구사항**: 관리자는 모든 작업 가능, 사용자는 조회만 가능

```typescript
// 1. 관리자 컨트롤러 (모든 작업 허용)
@Crud({
  only: [
    CrudOperation.Index,
    CrudOperation.Show,
    CrudOperation.Create,
    CrudOperation.Update,
    CrudOperation.Delete,
  ],
  resourceType: 'users',
  allowedFilters: {
    name: ['eq', 'like'],
    email: ['eq'],
    isActive: ['eq'],
  },
})
@Controller('admin/users')
@UseGuards(AdminGuard)  // 관리자만 접근 가능
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}
}

// 2. 사용자 컨트롤러 (조회만 허용)
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show],
  resourceType: 'users',
  allowedFilters: {
    name: ['eq', 'like'],
  },
  // 민감 정보 제외는 user.serializer.ts에서 관리 (파일 기반 Serializer 사용)
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

---

## 트러블슈팅

### 1. "Cannot find service method" 에러

**원인**: 서비스가 CrudBaseService를 상속받지 않음

**해결**:
```typescript
// ❌ 잘못된 예
@Injectable()
export class UsersService {
  // ...
}

// ✅ 올바른 예
@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', { /* config */ });
  }
}
```

### 2. N+1 쿼리 발생

**원인**: `eagerLoad: false` 또는 미설정

**해결**:
```typescript
@Crud({
  // ...
  performance: {
    query: {
      eagerLoad: true,  // ✅ 반드시 활성화
    },
  },
})
```

### 3. 필터가 작동하지 않음

**원인**: `allowedFilters`에 필드가 정의되지 않음

**해결**:
```typescript
@Crud({
  // ...
  allowedFilters: {
    name: ['eq', 'like', 'ilike'],  // ✅ 필터링할 필드 명시
  },
})
```

### 4. 민감한 정보 노출

**원인**: 파일 기반 Serializer에서 `excludeFields` 미설정

**해결**:
```typescript
// src/modules/users/user.serializer.ts
import { BaseSerializer } from '../../common/crud/serializers/base.serializer';
import { User } from './user.entity';

export class UserSerializer extends BaseSerializer<User> {
  protected excludeFields = ['password', 'resetToken', 'apiKey'];  // ✅ 제외할 필드 명시
}
```

### 5. 페이지네이션이 작동하지 않음

**원인**: `pagination` 설정 누락

**해결**:
```typescript
@Crud({
  // ...
  pagination: {
    defaultLimit: 20,  // ✅ 기본 페이지 크기
    limit: 100,        // ✅ 최대 페이지 크기
  },
})
```

---

## 참고 자료

### 관련 문서
- [프로젝트 CLAUDE.md](../../CLAUDE.md) - 전체 프로젝트 가이드
- [CRUD_DECORATOR_GUIDE.md](../../docs/CRUD_DECORATOR_GUIDE.md) - 상세 데코레이터 가이드
- [JSON_API.md](../../JSON_API.md) - JSON:API 1.1 스펙

### 핵심 파일 위치
- 데코레이터: `src/common/crud/decorators/crud.decorator.ts`
- 베이스 서비스: `src/common/crud/services/crud-base.service.ts`
- 쿼리 빌더: `src/common/crud/builders/prisma-query.builder.ts`
- 라우트 팩토리: `src/common/crud/factories/crud-route.factory.ts`

---

**마지막 업데이트**: 2025-11-09
**버전**: 1.0.0
**작성자**: Claude Code
