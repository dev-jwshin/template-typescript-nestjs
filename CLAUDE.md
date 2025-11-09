# Claude Code 가이드

> 이 프로젝트는 Claude Code(바이브 코딩)에 최적화된 NestJS TypeScript 템플릿입니다.

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [폴더 구조](#폴더-구조)
- [핵심 기능](#핵심-기능)
- [코딩 규칙](#코딩-규칙)
- [자주 사용하는 작업](#자주-사용하는-작업)
- [테스트](#테스트)
- [배포](#배포)

---

## 프로젝트 개요

### 기술 스택

- **Framework**: NestJS v11
- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 9.0+
- **Database**: PostgreSQL 14+ (Prisma ORM)
- **API Spec**: JSON:API 1.1 완전 준수
- **Testing**: Jest (Unit & E2E)
- **Caching**: Redis (optional)

### 프로젝트 특징

1. **🤖 AI 친화적 구조**: 명확한 타입 정의와 표준화된 패턴
2. **⚡ 80% 코드 감소**: @Crud 데코레이터 시스템으로 보일러플레이트 최소화
3. **🎯 JSON:API 1.1 완전 준수**: 표준화된 REST API
4. **🧪 테스트 커버리지 35%+**: 핵심 비즈니스 로직 100% 커버
5. **🔧 확장 가능**: 모듈화된 아키텍처

---

## 폴더 구조

```
template-typescript-nestjs/
│
├── 📂 src/                                      # 소스 코드
│   ├── app.module.ts                           # 루트 모듈
│   ├── main.ts                                 # 애플리케이션 진입점
│   │
│   ├── 📂 common/                              # 공통 모듈
│   │   ├── 📂 cache/                           # Redis 캐싱 시스템
│   │   ├── 📂 crud/                            # @Crud 데코레이터 시스템
│   │   │   ├── decorators/                     # CRUD 데코레이터
│   │   │   ├── builders/                       # Prisma 쿼리 빌더
│   │   │   ├── services/                       # CRUD 베이스 서비스
│   │   │   └── index.ts
│   │   ├── 📂 decorators/                      # 커스텀 데코레이터
│   │   ├── 📂 filters/                         # 예외 필터
│   │   ├── 📂 interceptors/                    # 인터셉터
│   │   ├── 📂 middlewares/                     # 미들웨어
│   │   ├── 📂 pipes/                           # 파이프
│   │   ├── 📂 interfaces/                      # 공통 인터페이스
│   │   └── 📂 utils/                           # 헬퍼 함수
│   │
│   ├── 📂 config/                              # 설정 파일
│   │
│   ├── 📂 database/                            # 데이터베이스 설정
│   │   ├── prisma.service.ts                   # Prisma 서비스
│   │   └── prisma.module.ts                    # Prisma 모듈
│   │
│   └── 📂 modules/                             # 기능 모듈
│       │
│       ├── 📂 health/                          # 헬스체크 모듈 (예시)
│       │
│       └── 📂 [feature]/                       # 모듈 템플릿 구조 ⭐
│           │
│           ├── 📂 admin/                       # 관리자용 컨트롤러 (선택)
│           │   └── [feature].controller.ts
│           │
│           ├── 📂 api/                         # API용 컨트롤러 (필수)
│           │   └── [feature].controller.ts
│           │
│           ├── 📂 dto/                         # DTO 정의
│           │   ├── create-[feature].dto.ts
│           │   ├── create-[feature].dto.spec.ts
│           │   ├── update-[feature].dto.ts
│           │   └── update-[feature].dto.spec.ts
│           │
│           ├── 📂 interfaces/                  # 인터페이스 (선택)
│           │
│           ├── 📂 test/                        # 테스트 파일
│           │   ├── 📂 unit/                    # 유닛 테스트
│           │   └── 📂 e2e/                     # E2E 테스트
│           │
│           ├── [feature].entity.ts             # Prisma 엔티티
│           ├── [feature].service.ts            # 비즈니스 로직
│           └── [feature].module.ts             # 모듈 정의
│
├── 📂 prisma/                                  # Prisma 설정
│   ├── schema.prisma                           # 데이터베이스 스키마
│   ├── 📂 migrations/                          # 마이그레이션 파일
│   └── seed.ts                                 # 시드 데이터
│
├── 📂 test/                                    # E2E 테스트
│
├── 📂 docs/                                    # 문서
│   └── CRUD_DECORATOR_GUIDE.md                 # CRUD 데코레이터 가이드
│
├── 📂 examples/                                # 예제 코드
│
├── 📄 README.md                                # 프로젝트 소개
├── 📄 ARCHITECTURE.md                          # 아키텍처 가이드
├── 📄 PRISMA.md                                # Prisma 가이드
├── 📄 JSON_API.md                              # JSON:API 가이드
└── 📄 CLAUDE.md                                # Claude Code 가이드 (이 파일)
```

### 모듈 구조 상세 설명

**실제 예시**: `users` 모듈 (현재 프로젝트)

```
📂 src/modules/users/
│
├── 📂 admin/                          # 관리자 전용 컨트롤러
│   └── users.controller.ts           # 관리자용 @Crud 데코레이터 API
│
├── 📂 api/                            # 일반 사용자 API 컨트롤러
│   └── users.controller.ts           # JSON:API 전용 @Crud 데코레이터 API
│
├── 📂 dto/                            # 데이터 전송 객체
│   ├── create-user.dto.ts            # 생성 DTO
│   ├── create-user.dto.spec.ts       # 생성 DTO 검증 테스트
│   ├── update-user.dto.ts            # 수정 DTO
│   └── update-user.dto.spec.ts       # 수정 DTO 검증 테스트
│
├── 📂 interfaces/                     # 타입 인터페이스 (현재 비어있음)
│
├── 📂 test/                           # 테스트 파일 (NEW ⭐)
│   ├── 📂 unit/                       # 유닛 테스트
│   └── 📂 e2e/                        # E2E 테스트
│
├── user.entity.ts                     # Prisma 엔티티 타입
├── users.service.ts                   # 비즈니스 로직 (CrudBaseService 상속)
└── users.module.ts                    # NestJS 모듈 정의
```

**폴더별 역할**:

| 폴더/파일              | 필수    | 역할                   | 설명                      |
| ---------------------- | ------- | ---------------------- | ------------------------- |
| `admin/`               | ❌ 선택 | 관리자 전용 API        | 백오피스 관리 기능        |
| `api/`                 | ✅ 필수 | 일반 사용자 API        | 서비스 핵심 API           |
| `dto/`                 | ✅ 필수 | 요청 검증 및 타입 정의 | class-validator 사용      |
| `interfaces/`          | ❌ 선택 | 공통 타입 인터페이스   | TypeScript 인터페이스     |
| `test/`                | ✅ 필수 | 테스트 파일 모음       | unit/, e2e/ 서브폴더      |
| `test/unit/`           | ✅ 필수 | 유닛 테스트            | 서비스, 헬퍼 함수 테스트  |
| `test/e2e/`            | ✅ 필수 | E2E 테스트             | 통합 시나리오 테스트      |
| `[feature].entity.ts`  | ✅ 필수 | Prisma 엔티티 타입     | 데이터베이스 모델 타입    |
| `[feature].service.ts` | ✅ 필수 | 비즈니스 로직          | CrudBaseService 상속 권장 |
| `[feature].module.ts`  | ✅ 필수 | NestJS 모듈 정의       | 컨트롤러/서비스 등록      |

**현재 users 모듈 특징**:

- ✅ 관리자/일반 API 분리 구조 (`admin/`, `api/`)
- ✅ @Crud 데코레이터로 80% 코드 감소
- ✅ JSON:API 1.1 완전 준수
- ✅ 테스트 파일 체계화 (`test/unit/`, `test/e2e/`)
- ✅ CrudBaseService 상속으로 자동 CRUD 구현
- ✅ DTO 레벨 검증 테스트 포함

---

## 핵심 기능

### 1. @Crud 데코레이터 시스템

**목적**: 보일러플레이트 코드 80% 감소

```typescript
import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../../common/crud';
import { UsersService } from '../users.service';

@Crud({
  // 생성할 엔드포인트
  only: [
    CrudOperation.Index, // GET /api/users
    CrudOperation.Show, // GET /api/users/:id
    CrudOperation.Create, // POST /api/users
    CrudOperation.Update, // PATCH /api/users/:id
    CrudOperation.Delete, // DELETE /api/users/:id
  ],

  // JSON:API 리소스 타입
  resourceType: 'users',

  // 허용된 필터
  allowedFilters: {
    name: ['eq', 'like', 'ilike'],
    email: ['eq', 'like'],
    isActive: ['eq'],
  },

  // 허용된 정렬
  allowedSorts: ['createdAt', 'name', 'email'],

  // 페이지네이션
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

**지원 기능**:

- ✅ 13가지 필터 연산자 (eq, ne, gt, gte, lt, lte, like, ilike, in, nin, between, isNull, isNotNull)
- ✅ Sparse Fieldsets (`?fields[users]=name,email`)
- ✅ Sorting (`?sort=-createdAt,name`)
- ✅ Pagination (`?page[number]=1&page[size]=10`)
- ✅ 관계 포함 (`?include=posts,profile`)
- ✅ N+1 쿼리 자동 최적화

📚 **자세한 내용**: [docs/CRUD_DECORATOR_GUIDE.md](./docs/CRUD_DECORATOR_GUIDE.md)

### 2. JSON:API 1.1 완전 준수

**요청 예시**:

```bash
# 사용자 생성
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "users",
      "attributes": {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "SecureP@ss123"
      }
    }
  }'
```

**응답 예시**:

```json
{
  "jsonapi": { "version": "1.1" },
  "data": {
    "type": "users",
    "id": "1",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com",
      "isActive": true,
      "createdAt": "2025-11-09T01:00:00.000Z"
    }
  }
}
```

📚 **자세한 내용**: [JSON_API.md](./JSON_API.md)

### 3. Prisma ORM

**스키마 정의**:

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

**주요 명령어**:

```bash
# 스키마 변경 후 마이그레이션
pnpm prisma:migrate

# Prisma Client 재생성
pnpm prisma:generate

# Prisma Studio 실행 (GUI)
pnpm prisma:studio

# 데이터베이스 시드
pnpm prisma:seed
```

📚 **자세한 내용**: [PRISMA.md](./PRISMA.md)

### 4. Redis 캐싱 (Optional)

**설정**:

```env
# .env
CACHE_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=3600
```

**사용 예시**:

```typescript
import { CacheService } from './common/cache/cache.service';

@Injectable()
export class UsersService {
  constructor(private readonly cacheService: CacheService) {}

  async findOne(id: string) {
    // 캐시 확인
    const cached = await this.cacheService.get(`user:${id}`);
    if (cached) return cached;

    // DB 조회
    const user = await this.prisma.user.findUnique({ where: { id } });

    // 캐시 저장 (1시간)
    await this.cacheService.set(`user:${id}`, user, 3600);

    return user;
  }
}
```

---

## 코딩 규칙

### TypeScript 스타일 가이드

1. **명명 규칙**
   - 클래스: PascalCase (`UsersService`)
   - 함수/변수: camelCase (`findUser`)
   - 상수: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
   - 인터페이스: PascalCase with `I` prefix (`IUser`) - 선택사항
   - 파일명: kebab-case (`user.service.ts`)

2. **타입 정의**
   - 모든 함수는 명시적인 리턴 타입을 가져야 함
   - `any` 사용 금지 (불가피한 경우 `unknown` 사용)
   - DTO는 class-validator 사용

3. **주석 규칙**
   - 모든 public 메서드는 JSDoc 주석 필수
   - 복잡한 로직은 인라인 주석 추가
   - 주석은 한글로 작성

**좋은 예시**:

```typescript
/**
 * 사용자 생성
 *
 * @param createUserDto 사용자 생성 데이터
 * @returns 생성된 사용자 정보 (비밀번호 제외)
 */
async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
  // 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

  // 사용자 생성
  return this.prisma.user.create({
    data: {
      ...createUserDto,
      password: hashedPassword,
    },
  });
}
```

### 모듈 구조 규칙

새로운 모듈을 생성할 때는 다음 구조를 따릅니다:

```
modules/[feature-name]/
├── admin/                    # 관리자용 컨트롤러 (선택사항)
│   └── [feature].controller.ts
├── api/                      # API용 컨트롤러 (필수)
│   └── [feature].controller.ts
├── dto/                      # DTO 정의
│   ├── create-[feature].dto.ts
│   ├── create-[feature].dto.spec.ts
│   ├── update-[feature].dto.ts
│   └── update-[feature].dto.spec.ts
├── interfaces/               # 인터페이스 (선택사항)
├── test/                     # 테스트 파일 (필수)
│   ├── unit/                 # 유닛 테스트
│   └── e2e/                  # E2E 테스트
├── [feature].entity.ts       # Prisma 엔티티
├── [feature].service.ts      # 비즈니스 로직
└── [feature].module.ts       # 모듈 정의
```

### Git 커밋 규칙

커밋 메시지는 다음 형식을 따릅니다:

```
<type>: <subject>

<body>
```

**Type**:

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `docs`: 문서 수정
- `chore`: 빌드/설정 변경
- `perf`: 성능 개선

**예시**:

```
feat: 사용자 인증 기능 추가

- JWT 기반 인증 구현
- 로그인/로그아웃 엔드포인트 추가
- AuthGuard 및 AuthService 구현

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 자주 사용하는 작업

### 1. 새로운 모듈 생성

```bash
# NestJS CLI로 모듈 생성
nest g module modules/posts
nest g service modules/posts
nest g controller modules/posts/api/posts
```

**수동 생성 체크리스트**:

1. ✅ `modules/posts/` 폴더 생성
2. ✅ `posts.entity.ts` - Prisma 스키마에 모델 추가 후 타입 정의
3. ✅ `posts.service.ts` - 비즈니스 로직 (CrudBaseService 상속)
4. ✅ `posts.module.ts` - 모듈 정의
5. ✅ `api/posts.controller.ts` - @Crud 데코레이터 적용
6. ✅ `dto/create-post.dto.ts`, `dto/update-post.dto.ts` - DTO 정의
7. ✅ 테스트 파일 생성 (`posts.service.spec.ts`)

### 2. Prisma 스키마 수정

```bash
# 1. prisma/schema.prisma 수정
# 2. 마이그레이션 생성 및 적용
pnpm prisma:migrate

# 3. Prisma Client 재생성
pnpm prisma:generate
```

### 3. 테스트 실행

```bash
# 전체 테스트
pnpm test

# 특정 파일 테스트
pnpm test users.service.spec.ts

# Watch 모드
pnpm test:watch

# 커버리지 확인
pnpm test:cov

# E2E 테스트
pnpm test:e2e
```

### 4. 개발 서버 실행

```bash
# 개발 모드 (Hot Reload)
pnpm start:dev

# 디버그 모드
pnpm start:debug

# 프로덕션 빌드
pnpm build
pnpm start:prod
```

### 5. 데이터베이스 초기화

```bash
# 데이터베이스 리셋 (마이그레이션 재적용 + 시드)
pnpm db:reset

# 시드만 실행
pnpm prisma:seed
```

---

## 테스트

### 테스트 구조

```
src/
├── modules/users/
│   ├── users.service.spec.ts       # 서비스 유닛 테스트
│   └── dto/
│       ├── create-user.dto.spec.ts  # DTO 검증 테스트
│       └── update-user.dto.spec.ts
│
test/
├── crud-system.e2e-spec.ts         # CRUD 시스템 E2E 테스트
├── crud-hooks-plugins.e2e-spec.ts  # Hook & Plugin E2E 테스트
└── performance-test.ts             # 성능 테스트
```

### 테스트 작성 가이드

**서비스 유닛 테스트 예시**:

```typescript
// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('사용자를 생성해야 함', async () => {
      const createDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      const expectedUser = { id: '1', ...createDto, isActive: true };
      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createDto.name,
          email: createDto.email,
        }),
      });
    });
  });
});
```

### 현재 테스트 커버리지

```
File                              | % Stmts | % Branch | % Funcs | % Lines
----------------------------------|---------|----------|---------|--------
All files                         |   35.37 |    30.11 |   31.12 |   35.21
 Service Layer (비즈니스 로직)      |     100 |      100 |     100 |     100
 Controller Layer (API 엔드포인트)  |       0 |        0 |       0 |       0
```

---

## 배포

### 환경 변수

**필수 환경 변수** (`.env`):

```env
# 애플리케이션
NODE_ENV=production
PORT=3000
API_PREFIX=api

# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis (선택사항)
CACHE_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=3600
```

### Docker 배포

```bash
# 1. 빌드
docker-compose build

# 2. 실행
docker-compose up -d

# 3. 로그 확인
docker-compose logs -f api
```

### 프로덕션 체크리스트

- [ ] 환경 변수 설정 확인
- [ ] 데이터베이스 마이그레이션 적용 (`pnpm prisma:migrate:deploy`)
- [ ] 빌드 성공 확인 (`pnpm build`)
- [ ] 테스트 통과 확인 (`pnpm test`)
- [ ] Lint 통과 확인 (`pnpm lint`)
- [ ] 보안 취약점 스캔 (`pnpm audit`)
- [ ] 성능 테스트 실행
- [ ] 로그 모니터링 설정
- [ ] 에러 추적 설정 (Sentry 등)

---

## 참고 문서

- [README.md](./README.md) - 프로젝트 소개 및 빠른 시작
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 아키텍처 상세 가이드
- [PRISMA.md](./PRISMA.md) - Prisma ORM 사용 가이드
- [JSON_API.md](./JSON_API.md) - JSON:API 1.1 스펙 가이드
- [docs/CRUD_DECORATOR_GUIDE.md](./docs/CRUD_DECORATOR_GUIDE.md) - CRUD 데코레이터 상세 가이드

---

## 문제 해결

### 자주 발생하는 문제

**1. Prisma Client 오류**

```bash
# 해결: Prisma Client 재생성
pnpm prisma:generate
```

**2. 마이그레이션 충돌**

```bash
# 해결: 데이터베이스 리셋
pnpm db:reset
```

**3. 포트 충돌**

```bash
# 해결: .env에서 PORT 변경
PORT=3001
```

**4. Redis 연결 실패**

```bash
# 해결: Redis 비활성화
CACHE_ENABLED=false
```

**5. 테스트 실패**

```bash
# 해결: node_modules 재설치
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Claude Code 팁

### 효과적인 프롬프트 작성

**좋은 예시**:

```
"users 모듈에 이메일 인증 기능을 추가해줘.
- 이메일 발송은 Nodemailer 사용
- 인증 토큰은 UUID로 생성하고 Redis에 저장 (TTL: 1시간)
- DTO와 테스트 코드도 함께 작성해줘"
```

**나쁜 예시**:

```
"이메일 인증 추가해줘"
```

### 컨텍스트 제공

Claude Code에게 작업을 요청할 때는 다음 정보를 제공하세요:

1. **작업 범위**: 어느 모듈/파일을 수정할지
2. **요구사항**: 구체적인 기능 명세
3. **제약사항**: 사용할 라이브러리, 성능 요구사항 등
4. **테스트 요구사항**: 어떤 테스트를 작성할지

### 코드 리뷰 요청

```
"방금 작성한 users.service.ts를 리뷰해줘. 다음 관점에서 확인해줘:
- 보안 취약점
- 성능 이슈
- 테스트 커버리지
- 타입 안정성"
```

---

**마지막 업데이트**: 2025-11-09
**프로젝트 버전**: 1.0.0
**문서 관리자**: Claude Code
