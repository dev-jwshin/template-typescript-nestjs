# NestJS TypeScript Template

> 바이브 코딩(Claude Code) 최적화 & 실제 개발 친화적인 NestJS TypeScript 프로젝트 템플릿

## 🎯 프로젝트 특징

이 템플릿은 다음 세 가지 목표를 균형있게 달성합니다:

1. **🤖 AI 코딩 최적화**: 명확한 구조와 타입 안정성으로 Claude Code 작업 효율 극대화
2. **👨‍💻 개발자 친화성**: 직관적이고 표준화된 NestJS 패턴 준수
3. **🔧 유지보수성**: 모듈화된 구조와 확장 가능한 아키텍처

## 📦 기술 스택

- **Framework**: NestJS v11 (최신 안정화 버전)
- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 9.0+
- **Database**: PostgreSQL 14+ (Prisma ORM)
- **API Specification**: JSON:API 1.1 (완전 준수)
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest (Unit & E2E)
- **Code Quality**: ESLint, Prettier

## 🎨 JSON:API 1.1 지원

이 프로젝트는 [JSON:API 1.1 스펙](https://jsonapi.org/format/1.1/)을 완전히 준수합니다.

### 지원 기능

✅ **Resource Objects** - 표준화된 리소스 구조 (type, id, attributes)
✅ **Sparse Fieldsets** - 필요한 필드만 요청 (`?fields[users]=name,email`)
✅ **Filtering** - 조건 기반 필터링 (`?filter[isActive]=true`)
✅ **Sorting** - 정렬 지원 (`?sort=-createdAt,name`)
✅ **Pagination** - 페이지네이션 (`?page[number]=1&page[size]=10`)
✅ **Error Handling** - 표준화된 에러 응답 형식
✅ **Compound Documents** - 관련 리소스 포함 (`?include=posts`)
✅ **Request Transformation** - JSON:API 요청 자동 변환 Middleware

### 빠른 예시

```bash
# 사용자 목록 조회 (페이지네이션 + 필터링)
curl "http://localhost:3000/api/users?filter[isActive]=true&page[number]=1&page[size]=10"

# 사용자 생성 (JSON:API 형식)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "users",
      "attributes": {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "securepass123"
      }
    }
  }'
```

📚 **자세한 내용**: [JSON_API.md](./JSON_API.md) 참고

## ⚡ @Crud 데코레이터 시스템

이 프로젝트는 **90% 코드 감소**를 달성하는 강력한 CRUD 데코레이터 시스템을 제공합니다.

### 주요 특징

- 🚀 **@CrudEntity 데코레이터** - Entity 중심 설계로 Service 레이어 코드 90% 감소 (50줄 → 5줄)
- 🔄 **재귀적 직렬화** - 관계 데이터의 민감 정보 자동 제외 (password, apiKey 등)
- 🎯 **자동 CRUD 엔드포인트 생성** - 단일 데코레이터로 5개 엔드포인트 자동 생성
- 🔍 **13가지 필터 연산자** - eq, ne, gt, gte, lt, lte, like, ilike, in, nin, between, isNull, isNotNull
- 📄 **자동 페이지네이션** - Offset 및 Cursor 기반 페이지네이션 지원
- 🎨 **Sparse Fieldsets** - 필요한 필드만 선택적으로 조회
- 🔗 **관계 포함** - Eager loading으로 N+1 쿼리 자동 최적화
- 🎨 **JSON:API 1.1 완전 준수** - 표준화된 요청/응답 형식
- 🔌 **Hook & Plugin 시스템** - Before/After 훅과 확장 가능한 플러그인

### 새로운 방식: @CrudEntity 데코레이터 (권장)

**Service 레이어 코드 90% 감소** - Entity 중심 설계로 설정을 한 곳에서 관리

```typescript
// 1. Entity에 @CrudEntity 데코레이터 적용
import { CrudEntity } from '../../common/crud';

@CrudEntity({
  modelName: 'user',  // Prisma 모델명 (필수)
  serialize: {
    exclude: ['password'],  // 응답에서 제외할 필드
  },
})
export class User {
  id: string;
  name: string;
  email: string;
  password: string;  // ❌ 응답에서 자동 제외
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Service 레이어 최소화 (단 5줄)
import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../common/crud';
import { PrismaService } from '../../database/prisma.service';
import { User } from './user.entity';

@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(prisma: PrismaService) {
    super(prisma, User);  // ✅ Entity 클래스만 전달 (모든 설정 자동 적용)
  }
}

// 3. Controller는 기존과 동일
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show],
  resourceType: 'users',
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

📚 **자세한 내용**: [docs/CRUD_ENTITY_DECORATOR.md](./docs/CRUD_ENTITY_DECORATOR.md)

### 기존 방식: Controller + Service 설정 (호환성 유지)

```typescript
import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../common/crud';
import { UsersService } from './users.service';

@Crud({
  // 생성할 엔드포인트 선택
  only: [
    CrudOperation.Index,   // GET /users
    CrudOperation.Show,    // GET /users/:id
    CrudOperation.Create,  // POST /users
    CrudOperation.Update,  // PATCH /users/:id
    CrudOperation.Delete,  // DELETE /users/:id
  ],

  // JSON:API 리소스 타입
  resourceType: 'users',

  // 허용된 필터 (필드명 → 연산자 배열)
  allowedFilters: {
    name: ['eq', 'like', 'ilike'],
    email: ['eq', 'like'],
    isActive: ['eq'],
    createdAt: ['gt', 'gte', 'lt', 'lte', 'between'],
  },

  // 허용된 정렬 필드
  allowedSorts: ['createdAt', 'updatedAt', 'name'],

  // 허용된 관계
  allowedIncludes: ['profile', 'posts'],

  // 페이지네이션 설정
  pagination: {
    defaultLimit: 20,
    limit: 100,
  },

  // Create/Update에서 허용할 파라미터
  allowedParams: {
    name: {
      required: true,
      description: '사용자 이름',
      example: 'John Doe',
    },
    email: {
      required: true,
      description: '사용자 이메일',
      example: 'john@example.com',
    },
    password: {
      type: 'string',
      required: false,
      description: '비밀번호',
      example: 'SecureP@ssw0rd',
    },
  },

  // 응답에서 제외할 필드
  serialize: {
    exclude: ['password'],
  },

  // N+1 쿼리 자동 최적화
  performance: {
    query: {
      eagerLoad: true,
    },
  },
})
@Controller('users')
export class UsersJsonApiController {
  constructor(private readonly usersService: UsersService) {}
}
```

### API 사용 예시

```bash
# 1. 목록 조회 (필터링 + 정렬 + 페이지네이션)
curl "http://localhost:3000/api/users?\
filter[isActive][eq]=true&\
filter[createdAt][gte]=2024-01-01&\
sort=-createdAt,name&\
page[number]=1&\
page[size]=10"

# 2. 특정 필드만 조회 (Sparse Fieldsets)
curl "http://localhost:3000/api/users?fields[users]=name,email"

# 3. 관계 포함 조회
curl "http://localhost:3000/api/users/1?include=profile,posts"

# 4. 사용자 생성
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "users",
      "attributes": {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "SecurePassword123"
      }
    }
  }'

# 5. 사용자 수정
curl -X PATCH http://localhost:3000/api/users/1 \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "users",
      "id": "1",
      "attributes": {
        "name": "Jane Doe"
      }
    }
  }'

# 6. 사용자 삭제
curl -X DELETE http://localhost:3000/api/users/1
```

## 🪝 Hook 시스템

Before/After 훅으로 CRUD 작업에 커스텀 로직을 추가할 수 있습니다.

### 사용 가능한 Hook

- `@BeforeIndex()` - Index 조회 전 실행
- `@AfterIndex()` - Index 조회 후 실행
- `@BeforeShow()` - Show 조회 전 실행
- `@AfterShow()` - Show 조회 후 실행
- `@BeforeCreate()` - Create 생성 전 실행
- `@AfterCreate()` - Create 생성 후 실행
- `@BeforeUpdate()` - Update 수정 전 실행
- `@AfterUpdate()` - Update 수정 후 실행
- `@BeforeDelete()` - Delete 삭제 전 실행
- `@AfterDelete()` - Delete 삭제 후 실행

### Hook 예시

```typescript
import {
  Crud,
  BeforeCreate,
  AfterCreate,
  BeforeUpdate,
  BeforeDelete,
  CrudContext
} from '../../common/crud';

@Crud({
  only: [CrudOperation.Index, CrudOperation.Create],
  resourceType: 'users',
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Create 전에 비밀번호 해싱
  @BeforeCreate()
  async hashPassword(context: CrudContext): Promise<void> {
    const { body } = context;
    if (body.password) {
      const bcrypt = require('bcrypt');
      body.password = await bcrypt.hash(body.password, 10);
    }
  }

  // Create 후에 환영 이메일 발송
  @AfterCreate()
  async sendWelcomeEmail(context: CrudContext): Promise<void> {
    const { result } = context;
    console.log(`Sending welcome email to ${result.email}`);
    // 이메일 발송 로직...
  }

  // Update 전에 권한 체크
  @BeforeUpdate()
  async checkPermission(context: CrudContext): Promise<void> {
    const { params, request } = context;
    const userId = params.id;
    const currentUser = request.user; // JWT에서 추출

    if (currentUser.id !== userId && !currentUser.isAdmin) {
      throw new ForbiddenException('You can only update your own profile');
    }
  }

  // Delete 전에 소프트 삭제로 변경
  @BeforeDelete()
  async softDelete(context: CrudContext): Promise<void> {
    const { params } = context;
    // 실제 삭제 대신 isDeleted 플래그 설정
    await this.usersService.update(params.id, { isDeleted: true });
    context.preventDefault(); // 실제 삭제 방지
  }
}
```

## 🔌 Plugin 시스템

재사용 가능한 플러그인으로 CRUD 기능을 확장할 수 있습니다.

### 내장 Plugin

#### 1. AuditLogPlugin - 감사 로그

모든 CRUD 작업을 자동으로 로깅합니다.

```typescript
import { Crud, CrudPlugin } from '../../common/crud';
import { AuditLogPlugin } from '../../common/crud/plugins/audit-log.plugin';

@Crud({
  only: [CrudOperation.Create, CrudOperation.Update, CrudOperation.Delete],
  resourceType: 'users',
  plugins: [
    new AuditLogPlugin({
      logService: auditLogService, // 로깅 서비스 주입
      includeBody: true,            // 요청 본문 포함 여부
      includeResult: false,         // 응답 결과 포함 여부
    }),
  ],
})
@Controller('users')
export class UsersController {}
```

**로그 예시:**
```json
{
  "operation": "create",
  "resourceType": "users",
  "userId": "user-123",
  "timestamp": "2024-01-15T10:30:00Z",
  "body": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### 2. CachingPlugin - 캐싱

조회 결과를 자동으로 캐싱합니다.

```typescript
import { CachingPlugin } from '../../common/crud/plugins/caching.plugin';

@Crud({
  only: [CrudOperation.Index, CrudOperation.Show],
  resourceType: 'users',
  plugins: [
    new CachingPlugin({
      ttl: 300,              // 캐시 유효 시간 (초)
      keyPrefix: 'users:',   // 캐시 키 접두사
    }),
  ],
})
@Controller('users')
export class UsersController {}
```

**캐시 키 예시:**
- Index: `users:index:?filter[isActive]=true&page[number]=1`
- Show: `users:show:123`

#### 3. RateLimitPlugin - 속도 제한

API 호출 횟수를 제한합니다.

```typescript
import { RateLimitPlugin } from '../../common/crud/plugins/rate-limit.plugin';

@Crud({
  only: [CrudOperation.Create, CrudOperation.Update],
  resourceType: 'users',
  plugins: [
    new RateLimitPlugin({
      limit: 10,            // 최대 요청 수
      window: 60,           // 시간 창 (초)
      keyExtractor: (req) => req.ip, // 키 추출 함수
    }),
  ],
})
@Controller('users')
export class UsersController {}
```

### 커스텀 Plugin 작성

```typescript
import { CrudPlugin, CrudContext, CrudOperation } from '../../common/crud';

export class CustomValidationPlugin implements CrudPlugin {
  name = 'custom-validation';

  registerHooks() {
    return {
      before: {
        [CrudOperation.Create]: async (context: CrudContext) => {
          // Create 전에 커스텀 검증 로직
          const { body } = context;

          if (body.email && !body.email.endsWith('@company.com')) {
            throw new BadRequestException('Only company emails are allowed');
          }
        },
        [CrudOperation.Update]: async (context: CrudContext) => {
          // Update 전에 커스텀 검증 로직
          const { body, params } = context;

          // 비즈니스 규칙 체크
          if (body.role === 'admin') {
            const user = await this.usersService.findOne(params.id);
            if (!user.isVerified) {
              throw new BadRequestException('Only verified users can be admins');
            }
          }
        },
      },
      after: {
        [CrudOperation.Create]: async (context: CrudContext) => {
          // Create 후에 후처리 로직
          const { result } = context;
          console.log(`New user created: ${result.id}`);
        },
      },
    };
  }
}

// 사용
@Crud({
  only: [CrudOperation.Create, CrudOperation.Update],
  resourceType: 'users',
  plugins: [new CustomValidationPlugin()],
})
@Controller('users')
export class UsersController {}
```

## 🔄 JSON:API Transform Middleware

JSON:API 형식의 요청을 자동으로 변환하는 미들웨어를 제공합니다.

### 작동 방식

미들웨어는 `application/vnd.api+json` Content-Type의 요청을 감지하고, JSON:API 형식을 일반 객체로 자동 변환합니다.

**변환 전:**
```json
{
  "data": {
    "type": "users",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com",
      "password": "SecurePassword123"
    }
  }
}
```

**변환 후:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

### 설정

미들웨어는 `AppModule`에서 글로벌로 적용되어 있으며, 모든 POST, PATCH, PUT 요청에 대해 자동으로 작동합니다.

```typescript
// src/app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JsonApiTransformMiddleware)
      .forRoutes(
        { path: '*', method: RequestMethod.POST },
        { path: '*', method: RequestMethod.PATCH },
        { path: '*', method: RequestMethod.PUT },
      );
  }
}
```

### 원본 데이터 접근

필요한 경우 변환 전 원본 JSON:API 데이터에 접근할 수 있습니다:

```typescript
@Post()
create(@Req() req: Request, @Body() body: CreateUserDto) {
  // 변환된 데이터
  console.log(body); // { name: 'John Doe', email: '...' }

  // 원본 JSON:API 데이터
  const original = (req as any).jsonApiOriginal;
  console.log(original.data.type); // 'users'
  console.log(original.data.attributes); // { name: 'John Doe', ... }
}
```

## 🔄 재귀적 직렬화 (Recursive Serialization)

관계 데이터의 민감한 정보를 자동으로 제외하는 강력한 직렬화 시스템

### 주요 기능

- ✅ **자동 민감 정보 제외**: 관계 데이터에서도 password, apiKey 등 자동 제외
- ✅ **재귀적 처리**: 깊이 제한 없이 중첩된 관계 데이터 모두 직렬화
- ✅ **Entity 중심 설정**: serialize.relations로 관계별 직렬화 규칙 정의
- ✅ **ServiceRegistry**: 서비스 간 자동 연결로 직렬화 로직 재사용

### 사용 예시

```typescript
// 1. Post Entity에 serialize.relations 설정
@CrudEntity({
  modelName: 'post',
  serialize: {
    exclude: ['isDraft'],  // Post의 isDraft 필드 제외
    relations: {
      author: 'user',     // author 관계는 user 모델로 직렬화
      comments: 'comment', // comments 관계는 comment 모델로 직렬화
    },
  },
})
export class Post {
  id: string;
  title: string;
  isDraft: boolean;  // ❌ 응답에서 제외
  author?: User;     // ✅ User 직렬화 규칙 자동 적용 (password 제외)
  comments?: Comment[]; // ✅ Comment 직렬화 규칙 자동 적용
}

// 2. API 응답 예시
GET /api/posts/1?include=author,comments

// ✅ 재귀적 직렬화 적용 후
{
  "jsonapi": { "version": "1.1" },
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "title": "Hello World",
      // "isDraft": false  ❌ 제외됨
      "author": {
        "id": "user-1",
        "name": "John Doe",
        "email": "john@example.com"
        // "password": "..."  ❌ 자동 제외 (User 직렬화 규칙 적용)
      },
      "comments": [
        {
          "id": "comment-1",
          "content": "Great post!",
          // "authorEmail": "..." ❌ 자동 제외 (Comment 직렬화 규칙 적용)
          // "authorIp": "..." ❌ 자동 제외
        }
      ]
    }
  }
}
```

📚 **자세한 내용**: [docs/RECURSIVE_SERIALIZATION.md](./docs/RECURSIVE_SERIALIZATION.md)

📚 **CRUD 워크플로우**: [CRUD_DECORATOR_WORKFLOW.md](./CRUD_DECORATOR_WORKFLOW.md) 참고

## 📂 프로젝트 구조

```
src/
├── common/              # 공통 유틸리티 및 공유 코드
│   ├── crud/            # CRUD 데코레이터 시스템 ⭐
│   │   ├── decorators/  # @Crud, Hook 데코레이터들
│   │   │   ├── crud.decorator.ts
│   │   │   ├── before-*.decorator.ts
│   │   │   └── after-*.decorator.ts
│   │   ├── factories/   # CRUD 라우트 자동 생성 팩토리
│   │   │   └── crud-route.factory.ts
│   │   ├── plugins/     # 재사용 가능한 플러그인들
│   │   │   ├── audit-log.plugin.ts
│   │   │   ├── caching.plugin.ts
│   │   │   └── rate-limit.plugin.ts
│   │   ├── interfaces/  # CRUD 시스템 인터페이스
│   │   └── index.ts     # 공개 API 익스포트
│   │
│   ├── decorators/      # 기타 커스텀 데코레이터
│   ├── filters/         # 예외 필터
│   │   └── jsonapi-exception.filter.ts
│   ├── guards/          # 인증/인가 가드
│   ├── interceptors/    # 요청/응답 인터셉터
│   │   └── jsonapi-transform.interceptor.ts
│   ├── middlewares/     # 미들웨어
│   │   └── jsonapi-transform.middleware.ts
│   ├── pipes/           # 유효성 검사 파이프
│   │   └── jsonapi-validation.pipe.ts
│   ├── interfaces/      # 공통 인터페이스
│   ├── types/           # 공통 타입 정의
│   └── utils/           # 헬퍼 함수
│
├── config/              # 설정 모듈
│   ├── app.config.ts
│   ├── database.config.ts
│   └── index.ts
│
├── modules/             # 기능 모듈 (도메인별)
│   ├── health/          # 헬스체크 모듈
│   └── users/           # 사용자 모듈 (예시)
│       ├── dto/         # 데이터 전송 객체
│       ├── entities/    # 엔티티/모델
│       ├── interfaces/  # 모듈 전용 인터페이스
│       ├── users.controller.ts          # 수동 방식 (260줄)
│       ├── users-crud.controller.ts     # @Crud 방식 (50줄)
│       ├── users-jsonapi.controller.ts  # JSON:API 전용 (50줄) ⭐
│       ├── users.service.ts
│       └── users.module.ts
│
├── database/            # 데이터베이스 관련
│   ├── prisma.service.ts
│   └── prisma.module.ts
│
├── app.module.ts        # 루트 모듈
└── main.ts              # 애플리케이션 엔트리포인트
```

## 🚀 시작하기

### 사전 요구사항

- Node.js 20 이상
- pnpm 9.0 이상 (`npm install -g pnpm` 또는 `brew install pnpm`)
- PostgreSQL 14 이상 (또는 Docker)

### 설치

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env

# .env 파일에서 DATABASE_URL 설정
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nestjs_db"

# Prisma Client 생성
pnpm prisma:generate

# 데이터베이스 마이그레이션
pnpm prisma:migrate
```

### Docker로 PostgreSQL 실행 (선택사항)

```bash
# PostgreSQL 컨테이너 실행
docker run --name nestjs-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=nestjs_db \
  -p 5432:5432 \
  -d postgres:16-alpine

# 또는 docker-compose 사용 (docker-compose.yml 있는 경우)
docker-compose up -d
```

### 개발 서버 실행

```bash
# 개발 모드 (핫 리로드)
pnpm start:dev

# 일반 모드
pnpm start

# 디버그 모드
pnpm start:debug
```

애플리케이션이 실행되면:
- API 서버: http://localhost:3000
- Swagger 문서: http://localhost:3000/api/docs

## 🧪 테스트

```bash
# 단위 테스트
pnpm test

# E2E 테스트
pnpm test:e2e

# 테스트 커버리지
pnpm test:cov

# 테스트 와치 모드
pnpm test:watch
```

## 🛠️ 빌드 & 배포

```bash
# 프로덕션 빌드
pnpm build

# 프로덕션 실행
pnpm start:prod
```

## 📋 개발 가이드

### 새 모듈 생성

NestJS CLI를 사용하여 새 모듈을 생성할 수 있습니다:

```bash
# 모듈, 서비스, 컨트롤러 한번에 생성
nest g resource modules/posts

# 개별 생성
nest g module modules/posts
nest g service modules/posts
nest g controller modules/posts
```

### 코드 스타일

```bash
# ESLint 검사
pnpm lint

# Prettier 포맷팅
pnpm format
```

### 디렉토리 구조 규칙

1. **모듈 단위 구성**: 각 기능은 `modules/` 하위에 독립적인 디렉토리로 구성
2. **계층 분리**: Controller → Service → Repository 패턴 준수
3. **DTO 활용**: 모든 입출력 데이터는 DTO로 정의하고 유효성 검사 포함
4. **타입 안정성**: 모든 함수와 변수에 명시적 타입 지정
5. **주석 작성**: 모든 클래스, 메서드에 JSDoc 주석 작성 (바이브 코딩 최적화)

### 환경 변수 관리

프로젝트는 환경별로 다른 `.env` 파일을 사용합니다:

- `.env.development` - 개발 환경
- `.env.test` - 테스트 환경
- `.env.production` - 프로덕션 환경

환경 변수는 `@nestjs/config`를 통해 타입 안전하게 접근합니다.

## 🎨 바이브 코딩 최적화 특징

### 1. 명확한 파일 네이밍
- 파일명에 역할이 명확히 드러남 (`.controller.ts`, `.service.ts`, `.dto.ts`)
- 디렉토리 구조가 기능 단위로 명확히 분리

### 2. 풍부한 타입 정보
- 모든 함수와 변수에 명시적 타입 선언
- DTO에 class-validator 데코레이터로 검증 규칙 명시
- Swagger 데코레이터로 API 스펙 자동 문서화

### 3. 주석 기반 컨텍스트
- 모든 클래스와 메서드에 JSDoc 주석
- 복잡한 로직은 인라인 주석으로 설명
- AI가 코드 의도를 정확히 이해할 수 있도록 구조화

### 4. 모듈화 & 독립성
- 각 모듈은 자체 완결적 구조
- 의존성이 명확히 선언됨 (imports, providers, exports)
- 모듈 간 결합도 최소화

## 📚 주요 엔드포인트

### Health Check
- `GET /health` - 서비스 헬스체크
- `GET /health/ready` - 서비스 준비 상태

### Users API (JSON:API 1.1)

#### 목록 조회 - GET /api/users
```bash
# 기본 조회
curl http://localhost:3000/api/users

# 필터링 + 정렬 + 페이지네이션
curl "http://localhost:3000/api/users?\
filter[isActive][eq]=true&\
filter[name][like]=John&\
sort=-createdAt,name&\
page[number]=1&\
page[size]=10"

# 특정 필드만 조회 (Sparse Fieldsets)
curl "http://localhost:3000/api/users?fields[users]=id,name,email"

# 관계 포함
curl "http://localhost:3000/api/users?include=profile,posts"
```

**응답 예시:**
```json
{
  "jsonapi": { "version": "1.1" },
  "data": [
    {
      "type": "users",
      "id": "1",
      "attributes": {
        "name": "John Doe",
        "email": "john@example.com",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 5,
      "total": 50
    }
  },
  "links": {
    "self": "/api/users?page[number]=1",
    "first": "/api/users?page[number]=1",
    "prev": null,
    "next": "/api/users?page[number]=2",
    "last": "/api/users?page[number]=5"
  }
}
```

#### 상세 조회 - GET /api/users/:id
```bash
curl http://localhost:3000/api/users/1
```

#### 생성 - POST /api/users
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "users",
      "attributes": {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "SecurePassword123"
      }
    }
  }'
```

#### 수정 - PATCH /api/users/:id
```bash
curl -X PATCH http://localhost:3000/api/users/1 \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "users",
      "id": "1",
      "attributes": {
        "name": "Jane Doe"
      }
    }
  }'
```

#### 삭제 - DELETE /api/users/:id
```bash
curl -X DELETE http://localhost:3000/api/users/1
```

### 지원되는 필터 연산자

| 연산자 | 설명 | 예시 |
|--------|------|------|
| `eq` | 같음 | `?filter[isActive][eq]=true` |
| `ne` | 같지 않음 | `?filter[status][ne]=deleted` |
| `gt` | 초과 | `?filter[age][gt]=18` |
| `gte` | 이상 | `?filter[age][gte]=18` |
| `lt` | 미만 | `?filter[age][lt]=65` |
| `lte` | 이하 | `?filter[age][lte]=65` |
| `like` | 부분 일치 (대소문자 구분) | `?filter[name][like]=John` |
| `ilike` | 부분 일치 (대소문자 무시) | `?filter[name][ilike]=john` |
| `in` | 포함 | `?filter[status][in]=active,pending` |
| `nin` | 불포함 | `?filter[status][nin]=deleted,banned` |
| `between` | 범위 | `?filter[age][between]=18,65` |
| `isNull` | NULL 여부 | `?filter[deletedAt][isNull]=true` |
| `isNotNull` | NOT NULL 여부 | `?filter[deletedAt][isNotNull]=true` |

## 💾 데이터베이스 관리 (Prisma ORM)

이 프로젝트는 [Prisma](https://www.prisma.io/)를 ORM으로 사용하여 PostgreSQL과 통신합니다.

### 주요 특징

- **타입 안전성**: 자동 생성된 타입으로 완벽한 타입 안전성 제공
- **직관적인 API**: 가독성 높은 쿼리 작성
- **마이그레이션 시스템**: 데이터베이스 스키마 버전 관리
- **Prisma Studio**: 내장 데이터베이스 GUI

### Prisma 명령어

```bash
# Prisma Studio (데이터베이스 GUI)
pnpm prisma:studio

# Prisma Client 생성
pnpm prisma:generate

# 스키마 변경 후 마이그레이션 생성
pnpm prisma:migrate

# 프로덕션 마이그레이션 적용
pnpm prisma:migrate:deploy

# 데이터베이스 초기화 (주의: 모든 데이터 삭제)
pnpm db:reset

# 스키마를 데이터베이스에 직접 푸시 (개발 전용)
pnpm db:push

# 스키마 파일 포맷팅
pnpm prisma format

# 스키마 검증
pnpm prisma validate
```

### 스키마 정의 예시

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

  @@map("users")
}
```

### 기본 쿼리 패턴

```typescript
// 생성
const user = await prisma.user.create({
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    password: hashedPassword,
  },
});

// 조회
const users = await prisma.user.findMany({
  where: { isActive: true },
  orderBy: { createdAt: 'desc' },
  take: 10,
  skip: 0,
});

// 수정
const updated = await prisma.user.update({
  where: { id: userId },
  data: { name: 'Jane Doe' },
});

// 삭제
await prisma.user.delete({
  where: { id: userId },
});
```

### 마이그레이션 워크플로우

1. `prisma/schema.prisma` 파일에서 모델 수정
2. `pnpm prisma:migrate` 실행하여 마이그레이션 생성
3. 마이그레이션 파일 확인 (`prisma/migrations/`)
4. 커밋 후 배포 시 `pnpm prisma:migrate:deploy` 실행

📚 **자세한 내용**: [PRISMA.md](./PRISMA.md) 참고

## 🗄️ 캐싱 시스템

애플리케이션 성능 향상을 위한 유연한 캐싱 시스템을 제공합니다.

### 캐시 드라이버 설정

두 가지 캐시 드라이버를 지원합니다:

| 드라이버 | 설명 | 권장 환경 | 영속성 | 분산 지원 |
|---------|------|----------|-------|----------|
| **Memory** | 인메모리 캐시 | 개발, 소규모 | ❌ | ❌ |
| **Redis** | Redis 서버 기반 | 프로덕션, 대규모 | ✅ | ✅ |

### 환경 변수 설정

```bash
# .env

# 캐시 드라이버 선택 (memory | redis)
CACHE_DRIVER=memory

# Redis 설정 (CACHE_DRIVER=redis일 때만 사용)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=300
```

### Docker Compose로 Redis 실행

```bash
# Redis 컨테이너 시작
docker-compose up -d redis

# Redis 연결 테스트
docker-compose exec redis redis-cli ping
# 응답: PONG

# Redis 모드로 애플리케이션 시작
CACHE_DRIVER=redis pnpm run start:dev
```

### 캐시 동작 원리

**CrudCacheInterceptor** 사용 시:
1. **GET 요청**: 캐시 조회 → 히트 시 즉시 반환, 미스 시 DB 조회 후 캐시 저장
2. **POST/PATCH/DELETE**: 자동 캐시 무효화

```typescript
// 컨트롤러에 캐시 적용
@Controller('users')
@UseInterceptors(CrudCacheInterceptor)
export class UsersController {
  // 모든 GET 요청이 자동으로 캐싱됨
}
```

### 캐시 성능 비교

| 지표 | Memory | Redis (로컬) | Redis (원격) |
|------|--------|-------------|-------------|
| 응답 시간 | ~1ms | ~2-5ms | ~10-30ms |
| 처리량 | 매우 높음 | 높음 | 중간 |
| 메모리 사용 | 프로세스 내 | 독립 프로세스 | 네트워크 |
| 확장성 | 단일 인스턴스 | 다중 인스턴스 | 클러스터 |

### Fallback 메커니즘

Redis 연결 실패 시 자동으로 Memory 캐시로 전환됩니다:

```
[CacheFactory] Redis Store 생성 실패: Connection refused
[CacheFactory] Memory Store로 대체합니다 (fallback)
✅ Memory Store 사용
```

## 🔐 보안

- **Validation**: class-validator로 입력 데이터 검증
- **Password Hashing**: bcrypt로 비밀번호 암호화
- **SQL Injection**: Prisma ORM의 파라미터화된 쿼리로 방어
- **Helmet**: HTTP 헤더 보안 설정 (추가 구현 가능)
- **CORS**: 환경 변수로 출처 제어
- **Rate Limiting**: API 속도 제한 (추가 구현 가능)

## 🤝 기여 가이드

1. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
2. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
3. 브랜치 푸시 (`git push origin feature/amazing-feature`)
4. Pull Request 생성

## 📄 라이선스

MIT License

## 📚 상세 문서

프로젝트의 상세한 기술 문서들입니다:

### 핵심 가이드
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 시스템 아키텍처 상세 설명
  - 계층화된 아키텍처 구조
  - JSON:API 레이어 통합
  - 설계 원칙 (SOLID)
  - 성능 최적화 가이드

- **[JSON_API.md](./JSON_API.md)** - JSON:API 1.1 스펙 완전 가이드
  - 응답/요청 형식 상세 설명
  - 쿼리 파라미터 사용법 (Filtering, Sorting, Pagination)
  - 에러 처리 가이드
  - cURL 및 JavaScript 예시

- **[PRISMA.md](./PRISMA.md)** - Prisma ORM 완전 가이드
  - 스키마 정의 및 마이그레이션
  - 고급 쿼리 패턴
  - 관계 설정 및 트랜잭션
  - 성능 최적화 및 모범 사례

### CRUD 데코레이터 시스템
- **[docs/CRUD_DECORATOR_GUIDE.md](./docs/CRUD_DECORATOR_GUIDE.md)** - CRUD 데코레이터 사용 가이드
  - @Crud 데코레이터 상세 설명
  - Hook & Plugin 시스템
  - 성능 최적화 (N+1 쿼리 방지)
  - 실전 예제 및 마이그레이션 가이드

### 개발 참고 자료
- **docs/archive/** - 개발 과정 문서 (아카이브)
  - 테스트 결과 및 구현 워크플로우
  - 프로젝트 요약 및 구현 히스토리

## 🔗 외부 참고 자료

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [JSON:API 공식 스펙](https://jsonapi.org/format/1.1/)
- [Claude Code 가이드](https://docs.claude.com/claude-code)

---

**Made with ❤️ for Claude Code & Developers**
