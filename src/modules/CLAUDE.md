# Modules 폴더 가이드

> NestJS 모듈 구조, 디렉토리/파일별 역할, 모듈 생성 가이드

## 📋 목차

- [개요](#개요)
- [표준 모듈 구조](#표준-모듈-구조)
- [디렉토리별 역할](#디렉토리별-역할)
- [파일별 역할](#파일별-역할)
- [모듈 생성 가이드](#모듈-생성-가이드)
- [실전 예제](#실전-예제)
- [베스트 프랙티스](#베스트-프랙티스)

---

## 개요

### Modules 폴더란?

NestJS의 핵심 아키텍처 패턴인 **모듈 시스템**을 구현하는 폴더입니다. 각 기능(도메인)별로 독립적인 모듈을 생성하여 관심사를 분리하고 재사용성을 높입니다.

### 설계 원칙

- ✅ **단일 책임 원칙**: 각 모듈은 하나의 도메인/기능만 담당
- ✅ **느슨한 결합**: 모듈 간 의존성 최소화
- ✅ **높은 응집도**: 관련된 기능은 하나의 모듈에 집중
- ✅ **재사용성**: 다른 프로젝트에서도 사용 가능한 구조
- ✅ **확장성**: 새로운 기능 추가 시 기존 코드 수정 최소화

---

## 표준 모듈 구조

### 기본 구조

```
src/modules/
│
├── 📂 health/                          # 헬스체크 모듈 (예시)
│   ├── health.controller.ts
│   ├── health.service.ts
│   └── health.module.ts
│
└── 📂 [feature]/                       # 기능별 모듈 (표준 구조)
    │
    ├── 📂 admin/                       # 관리자 전용 컨트롤러 (선택)
    │   └── [feature].controller.ts    # 관리자 API (모든 CRUD)
    │
    ├── 📂 api/                         # 일반 사용자 컨트롤러 (필수)
    │   └── [feature].controller.ts    # 일반 사용자 API
    │
    ├── 📂 dto/                         # 데이터 전송 객체 (필수)
    │   ├── create-[feature].dto.ts
    │   ├── update-[feature].dto.ts
    │
    ├── 📂 interfaces/                  # 타입 인터페이스 (선택)
    │   └── [feature].interface.ts
    │
    ├── 📂 test/                        # 테스트 파일 (필수)
    │   ├── 📂 unit/                    # 유닛 테스트
    │   │   ├── [feature].service.spec.ts
    │   │   └── [feature].helper.spec.ts
    │   └── 📂 e2e/                     # E2E 테스트
    │       └── [feature].e2e-spec.ts
    │
    ├── [feature].entity.ts             # Prisma 엔티티 타입 (필수)
    ├── [feature].serializer.ts         # 파일 기반 Serializer (권장) ⭐
    ├── [feature].service.ts            # 비즈니스 로직 (필수)
    └── [feature].module.ts             # 모듈 정의 (필수)
```

### 실제 예시: Users 모듈

```
src/modules/users/
│
├── 📂 admin/
│   └── users.controller.ts           # 관리자 API (모든 CRUD)
│
├── 📂 api/
│   └── users.controller.ts           # 일반 사용자 API (조회만)
│
├── 📂 dto/
│   ├── create-user.dto.ts            # 사용자 생성 DTO
│   ├── update-user.dto.ts            # 사용자 수정 DTO
│
├── 📂 interfaces/                     # 현재 비어있음
│
├── 📂 test/
│   ├── 📂 unit/
│   │   └── users.service.spec.ts
│   └── 📂 e2e/
│       └── users.e2e-spec.ts
│
├── user.entity.ts                     # User 엔티티 타입
├── user.serializer.ts                 # User 직렬화 규칙 (password 제외 등)
├── users.service.ts                   # 사용자 비즈니스 로직
└── users.module.ts                    # Users 모듈 정의 + Serializer 등록
```

---

## 디렉토리별 역할

### 1. admin/ (선택 사항)

**역할**: 관리자 전용 API 컨트롤러

**사용 시기**:

- 관리자와 일반 사용자 API를 명확히 분리해야 할 때
- 관리자만 접근 가능한 CRUD 작업이 있을 때
- 백오피스 기능이 필요할 때

**특징**:

- 모든 CRUD 작업 허용 (생성, 조회, 수정, 삭제)
- `/admin/[feature]` 경로 사용
- `@UseGuards(AdminGuard)` 적용 권장

**예시**:

```typescript
// admin/users.controller.ts
@Crud({
  only: [
    CrudOperation.Index,
    CrudOperation.Show,
    CrudOperation.Create,
    CrudOperation.Update,
    CrudOperation.Delete,
  ],
  resourceType: 'users',
  // ...
})
@Controller('admin/users')
@UseGuards(AdminGuard) // 관리자만 접근 가능
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

### 2. api/ (필수)

**역할**: 일반 사용자 API 컨트롤러

**사용 시기**:

- 모든 모듈에서 필수
- 일반 사용자가 접근하는 공개 API

**특징**:

- 제한된 CRUD 작업 (주로 조회만)
- `/[feature]` 경로 사용
- 민감한 정보 추가 제외 (`serialize.exclude`)

**예시**:

```typescript
// api/users.controller.ts
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show], // 조회만
  resourceType: 'users',
  serialize: {
    exclude: ['password', 'email'], // 민감 정보 제외
  },
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

### 3. dto/ (필수)

**역할**: 데이터 전송 객체 및 검증

**사용 시기**:

- Create/Update 요청 검증
- 클라이언트 ↔ 서버 데이터 전송

**특징**:

- `class-validator` 데코레이터 사용
- DTO마다 `.spec.ts` 테스트 파일 작성
- `PartialType`으로 Update DTO 생성

**파일 구조**:

```
dto/
├── create-[feature].dto.ts         # 생성 DTO
├── update-[feature].dto.ts         # 수정 DTO (PartialType)
```

**예시**:

```typescript
// create-user.dto.ts
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsInt()
  age?: number;
}

// update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### 4. interfaces/ (선택 사항)

**역할**: 공통 타입 인터페이스 정의

**사용 시기**:

- 여러 곳에서 재사용되는 타입이 있을 때
- 비즈니스 로직에서 사용하는 커스텀 타입
- 외부 API 응답 타입 정의

**예시**:

```typescript
// interfaces/user-response.interface.ts
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// interfaces/pagination.interface.ts
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}
```

### 5. test/ (필수)

**역할**: 테스트 파일 모음

**구조**:

```
test/
├── unit/                    # 유닛 테스트
│   ├── [feature].service.spec.ts     # 서비스 테스트
│   └── [feature].helper.spec.ts      # 헬퍼 함수 테스트
└── e2e/                     # E2E 테스트
    └── [feature].e2e-spec.ts         # API 통합 테스트
```

**사용 시기**:

- 모든 서비스 로직에 대한 유닛 테스트
- API 엔드포인트에 대한 E2E 테스트

**예시**:

```typescript
// test/unit/users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should create a user', async () => {
    const result = await service.create({ name: 'John', email: 'john@example.com' });
    expect(result).toBeDefined();
  });
});
```

---

## 파일별 역할

### 1. [feature].entity.ts (필수)

**역할**: Prisma 엔티티 타입 정의

**사용 시기**: 모든 모듈에서 필수

**특징**:

- Prisma에서 자동 생성된 타입을 재사용
- 필요 시 `Omit`, `Pick`으로 필드 추가/제거
- 비밀번호 제외 타입 등 별도 정의 가능

**예시**:

```typescript
// user.entity.ts
import { User as PrismaUser } from '@prisma/client';

/**
 * User 엔티티 타입
 */
export type User = PrismaUser;

/**
 * 비밀번호를 제외한 User 타입
 */
export type SafeUser = Omit<User, 'password'>;

/**
 * 공개 프로필용 User 타입
 */
export type PublicUser = Pick<User, 'id' | 'name' | 'createdAt'>;
```

### 2. [feature].serializer.ts (권장) ⭐

**역할**: 파일 기반 직렬화 규칙 정의

**사용 시기**:
- Entity에 민감 정보가 포함된 경우 (password, apiKey 등)
- 관계 데이터의 재귀적 직렬화가 필요한 경우
- 직렬화 로직을 중앙에서 관리하고 싶을 때

**특징**:
- `BaseSerializer<T>` 상속으로 표준화된 직렬화 구현
- `excludeFields`로 민감 정보 자동 제외
- `relations`로 재귀적 관계 직렬화 자동 처리
- `transform()`으로 커스텀 변환 로직 구현
- Config 기반 직렬화보다 우선순위 높음

**예시**:

```typescript
// user.serializer.ts
import { BaseSerializer } from '../../common/crud/serializers/base.serializer';
import { User } from './user.entity';

/**
 * UserSerializer
 *
 * User 엔티티의 직렬화 규칙 정의
 */
export class UserSerializer extends BaseSerializer<User> {
  /**
   * 응답에서 제외할 필드
   */
  protected excludeFields = ['password', 'resetToken'];

  /**
   * 관계 직렬화 매핑
   * - profile: User.profile → ProfileSerializer 자동 적용
   */
  protected relations = {
    profile: 'profile',  // ProfileSerializer 사용
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

**모듈에 등록**:

```typescript
// users.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { SerializerRegistry } from '../../common/crud/serializers/serializer-registry';
import { UserSerializer } from './user.serializer';

@Module({
  // ...
})
export class UsersModule implements OnModuleInit {
  onModuleInit() {
    // UserSerializer를 SerializerRegistry에 등록
    SerializerRegistry.register('user', new UserSerializer());
  }
}
```

**자동 적용 결과**:

```bash
# API 호출
GET /api/users/123?include=profile

# ✅ 자동 직렬화 결과
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

**장점**:
- ✅ 직렬화 로직 중앙화 (한 파일에서 관리)
- ✅ 재귀적 관계 직렬화 자동 처리
- ✅ 타입 안전성 보장
- ✅ 테스트 용이성

**참고 문서**: [파일 기반 Serializer 가이드](../../docs/FILE_BASED_SERIALIZER.md)

### 3. [feature].service.ts (필수)

**역할**: 비즈니스 로직 구현

**사용 시기**: 모든 모듈에서 필수

**특징**:

- `CrudBaseService<T>` 상속으로 기본 CRUD 자동 구현
- 커스텀 메서드 추가 가능
- 트랜잭션, 복잡한 쿼리 처리

**예시**:

```typescript
// users.service.ts
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
        name: ['eq', 'like'],
        email: ['eq'],
        isActive: ['eq'],
      },
      performance: {
        query: { eagerLoad: true },
      },
      serialize: {
        exclude: ['password'],
      },
    });
  }

  /**
   * 커스텀 메서드: 이메일로 사용자 찾기
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.model.findUnique({
      where: { email },
    });
    return user ? this.serialize(user) : null;
  }

  /**
   * 커스텀 메서드: 활성 사용자만 조회
   */
  async findActiveUsers(): Promise<User[]> {
    const users = await this.model.findMany({
      where: { isActive: true },
    });
    return users.map((user: User) => this.serialize(user));
  }
}
```

### 4. [feature].module.ts (필수)

**역할**: NestJS 모듈 정의 및 의존성 주입

**사용 시기**: 모든 모듈에서 필수

**특징**:

- 컨트롤러, 프로바이더 등록
- 다른 모듈 import
- 서비스 export (다른 모듈에서 사용 가능)
- **파일 기반 Serializer 등록** (OnModuleInit 구현)

**예시**:

```typescript
// users.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './api/users.controller';
import { AdminUsersController } from './admin/users.controller';
import { SerializerRegistry } from '../../common/crud/serializers/serializer-registry';
import { UserSerializer } from './user.serializer';

@Module({
  controllers: [
    UsersController, // 일반 사용자 API
    AdminUsersController, // 관리자 API
  ],
  providers: [UsersService],
  exports: [UsersService], // 다른 모듈에서 사용 가능
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

---

## 모듈 생성 가이드

### 방법 1: NestJS CLI 사용 (권장)

#### Step 1: 모듈 생성

```bash
# 모듈 생성
nest g module modules/posts

# 서비스 생성
nest g service modules/posts --no-spec

# 컨트롤러 생성 (api 폴더에)
nest g controller modules/posts/api/posts --no-spec

# 관리자 컨트롤러 생성 (선택 사항)
nest g controller modules/posts/admin/posts --no-spec
```

#### Step 2: 수동으로 나머지 파일 생성

```bash
cd src/modules/posts

# 엔티티 타입
touch post.entity.ts

# Serializer (권장)
touch post.serializer.ts

# DTO 생성
mkdir dto
touch dto/create-post.dto.ts
touch dto/update-post.dto.ts

# 테스트 폴더
mkdir -p test/unit test/e2e
touch test/unit/posts.service.spec.ts
touch test/e2e/posts.e2e-spec.ts

# interfaces 폴더 (선택)
mkdir interfaces
```

### 방법 2: 수동 생성

#### Step 1: Prisma 스키마 정의

```prisma
// prisma/schema.prisma
model Post {
  id        String   @id @default(uuid())
  title     String
  slug      String   @unique
  content   String
  authorId  String
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@map("posts")
  @@index([authorId])
  @@index([slug])
}
```

#### Step 2: 마이그레이션 실행

```bash
pnpm prisma:migrate
pnpm prisma:generate
```

#### Step 3: 엔티티 타입 정의

```typescript
// src/modules/posts/post.entity.ts
import { Post as PrismaPost } from '@prisma/client';

export type Post = PrismaPost;
```

#### Step 4: Serializer 생성 (권장)

```typescript
// src/modules/posts/post.serializer.ts
import { BaseSerializer } from '../../common/crud/serializers/base.serializer';
import { Post } from './post.entity';

export class PostSerializer extends BaseSerializer<Post> {
  /**
   * 응답에서 제외할 필드 (예: 초안 여부)
   */
  protected excludeFields = ['isDraft'];

  /**
   * 관계 직렬화 매핑
   */
  protected relations = {
    author: 'user',  // Post.author → UserSerializer 사용
  };
}
```

#### Step 5: DTO 생성

```typescript
// src/modules/posts/dto/create-post.dto.ts
import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreatePostDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  content: string;

  @IsUUID()
  authorId: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

// src/modules/posts/dto/update-post.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {}
```

#### Step 6: 서비스 생성

```typescript
// src/modules/posts/posts.service.ts
import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../common/crud/services/crud-base.service';
import { PrismaService } from '../../database/prisma.service';
import { Post } from './post.entity';

@Injectable()
export class PostsService extends CrudBaseService<Post> {
  constructor(prisma: PrismaService) {
    super(prisma, 'post', {
      allowedIncludes: ['author'],
      allowedFilters: {
        title: ['eq', 'like', 'ilike'],
        published: ['eq'],
        authorId: ['eq'],
        createdAt: ['gt', 'gte', 'lt', 'lte', 'between'],
      },
      allowedSorts: ['createdAt', 'updatedAt', 'title'],
      performance: {
        query: { eagerLoad: true },
      },
    });
  }

  /**
   * slug로 게시글 찾기
   */
  async findBySlug(slug: string): Promise<Post | null> {
    const post = await this.model.findUnique({
      where: { slug },
      include: { author: true },
    });
    return post ? this.serialize(post) : null;
  }

  /**
   * 발행된 게시글만 조회
   */
  async findPublished(): Promise<Post[]> {
    const posts = await this.model.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((post: Post) => this.serialize(post));
  }
}
```

#### Step 7: 컨트롤러 생성

```typescript
// src/modules/posts/api/posts.controller.ts
import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../../common/crud';
import { PostsService } from '../posts.service';

@Crud({
  only: [CrudOperation.Index, CrudOperation.Show],
  resourceType: 'posts',
  allowedFilters: {
    title: ['eq', 'like'],
    published: ['eq'],
  },
  allowedSorts: ['createdAt', 'title'],
  allowedIncludes: ['author'],
  pagination: {
    defaultLimit: 20,
    limit: 100,
  },
})
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}
}

// src/modules/posts/admin/posts.controller.ts
import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../../common/crud';
import { PostsService } from '../posts.service';

@Crud({
  only: [
    CrudOperation.Index,
    CrudOperation.Show,
    CrudOperation.Create,
    CrudOperation.Update,
    CrudOperation.Delete,
  ],
  resourceType: 'posts',
  allowedFilters: {
    title: ['eq', 'like', 'ilike'],
    published: ['eq'],
    authorId: ['eq'],
  },
  allowedSorts: ['createdAt', 'updatedAt', 'title'],
  allowedIncludes: ['author'],
  allowedParams: {
    title: { required: true },
    slug: { required: true },
    content: { required: true },
    authorId: { required: true },
    published: { required: false },
  },
})
@Controller('admin/posts')
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}
}
```

#### Step 8: 모듈 정의 + Serializer 등록

```typescript
// src/modules/posts/posts.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './api/posts.controller';
import { AdminPostsController } from './admin/posts.controller';
import { SerializerRegistry } from '../../common/crud/serializers/serializer-registry';
import { PostSerializer } from './post.serializer';

@Module({
  controllers: [PostsController, AdminPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule implements OnModuleInit {
  /**
   * 모듈 초기화 시 Serializer 등록
   */
  onModuleInit() {
    SerializerRegistry.register('post', new PostSerializer());
  }
}
```

#### Step 9: AppModule에 등록

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { PostsModule } from './modules/posts/posts.module';

@Module({
  imports: [
    // ...
    PostsModule, // ✅ 추가
  ],
})
export class AppModule {}
```

#### Step 10: 테스트 작성

```typescript
// src/modules/posts/test/unit/posts.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from '../../posts.service';
import { PrismaService } from '../../../../database/prisma.service';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: PrismaService;

  const mockPrisma = {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PostsService>(PostsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBySlug', () => {
    it('slug로 게시글을 찾아야 함', async () => {
      const mockPost = {
        id: '1',
        title: 'Test Post',
        slug: 'test-post',
        content: 'Content',
        authorId: '1',
        published: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.post.findUnique.mockResolvedValue(mockPost);

      const result = await service.findBySlug('test-post');

      expect(result).toBeDefined();
      expect(result.slug).toBe('test-post');
    });
  });
});
```

---

## 실전 예제

### 예제 1: Comments 모듈 (게시글 댓글)

#### Prisma 스키마

```prisma
model Comment {
  id        String   @id @default(uuid())
  content   String
  postId    String
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@map("comments")
  @@index([postId])
  @@index([authorId])
}
```

#### 서비스

```typescript
@Injectable()
export class CommentsService extends CrudBaseService<Comment> {
  constructor(prisma: PrismaService) {
    super(prisma, 'comment', {
      allowedIncludes: ['post', 'author'],
      allowedFilters: {
        postId: ['eq'],
        authorId: ['eq'],
      },
      allowedSorts: ['createdAt'],
      performance: {
        query: { eagerLoad: true },
      },
    });
  }

  /**
   * 특정 게시글의 댓글만 조회
   */
  async findByPostId(postId: string): Promise<Comment[]> {
    return this.findAll({
      filter: { postId },
      sort: [{ field: 'createdAt', order: 'ASC' }],
    });
  }
}
```

### 예제 2: Tags 모듈 (N:M 관계)

#### Prisma 스키마

```prisma
model Post {
  id   String @id @default(uuid())
  tags Tag[]  @relation("PostToTag")
  @@map("posts")
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique
  posts Post[] @relation("PostToTag")
  @@map("tags")
}
```

#### 서비스

```typescript
@Injectable()
export class TagsService extends CrudBaseService<Tag> {
  constructor(prisma: PrismaService) {
    super(prisma, 'tag', {
      allowedIncludes: ['posts'],
      allowedFilters: {
        name: ['eq', 'like', 'ilike'],
      },
      allowedSorts: ['name'],
    });
  }

  /**
   * 게시글에 태그 연결
   */
  async attachToPost(postId: string, tagNames: string[]): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        tags: {
          connect: tagNames.map((name) => ({ name })),
        },
      },
    });
  }
}
```

---

## 베스트 프랙티스

### 1. 명명 규칙

```typescript
// ✅ 좋은 예
posts.module.ts;
posts.service.ts;
api / posts.controller.ts;
admin / posts.controller.ts;
post.entity.ts;
create - post.dto.ts;

// ❌ 나쁜 예
PostsModule.ts;
post_service.ts;
PostController.ts;
createPostDTO.ts;
```

### 2. 폴더 구조 일관성

```
✅ 모든 모듈에서 동일한 구조 유지
modules/users/
  ├── admin/
  ├── api/
  ├── dto/
  ├── test/
  ├── user.entity.ts
  ├── users.service.ts
  └── users.module.ts

modules/posts/
  ├── admin/
  ├── api/
  ├── dto/
  ├── test/
  ├── post.entity.ts
  ├── posts.service.ts
  └── posts.module.ts
```

### 3. 의존성 주입

```typescript
// ✅ 좋은 예: 생성자 주입
@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}
}

// ❌ 나쁜 예: 직접 인스턴스 생성
@Injectable()
export class PostsService {
  private prisma = new PrismaService();
}
```

### 4. Service Export

```typescript
// ✅ 좋은 예: 다른 모듈에서 사용 가능하도록 export
@Module({
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService], // ✅ export
})
export class PostsModule {}

// 다른 모듈에서 사용
@Module({
  imports: [PostsModule], // PostsService를 사용할 수 있음
})
export class CommentsModule {}
```

### 5. 테스트 커버리지

```typescript
// ✅ 모든 서비스 메서드에 대한 테스트 작성
describe('PostsService', () => {
  describe('create', () => {
    it('should create a post', async () => {
      /* ... */
    });
  });

  describe('findBySlug', () => {
    it('should find post by slug', async () => {
      /* ... */
    });
    it('should return null if not found', async () => {
      /* ... */
    });
  });

  describe('findPublished', () => {
    it('should return only published posts', async () => {
      /* ... */
    });
  });
});
```

### 6. 에러 처리

```typescript
// ✅ 좋은 예: 명확한 에러 메시지
async findBySlug(slug: string): Promise<Post> {
  const post = await this.model.findUnique({ where: { slug } });

  if (!post) {
    throw new NotFoundException(`게시글(slug: ${slug})을 찾을 수 없습니다.`);
  }

  return this.serialize(post);
}

// ❌ 나쁜 예: 모호한 에러 메시지
async findBySlug(slug: string): Promise<Post> {
  const post = await this.model.findUnique({ where: { slug } });
  if (!post) throw new Error('Not found');
  return post;
}
```

---

## 참고 자료

### 관련 문서

- [프로젝트 CLAUDE.md](../CLAUDE.md) - 전체 프로젝트 가이드
- [@Crud 시스템 가이드](../common/crud/CLAUDE.md) - @Crud 데코레이터 상세 가이드
- [Prisma 가이드](../database/CLAUDE.md) - Prisma 및 데이터베이스 가이드
- [Common 모듈 가이드](../common/CLAUDE.md) - 공통 유틸리티 가이드

### 예시 모듈

- Users 모듈: `src/modules/users/`
- Health 모듈: `src/modules/health/`

---

**마지막 업데이트**: 2025-11-09
**버전**: 1.0.0
**작성자**: Claude Code
