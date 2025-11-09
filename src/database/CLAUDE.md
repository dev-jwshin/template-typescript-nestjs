# Prisma 및 데이터베이스 가이드

> Prisma ORM을 사용한 타입 안전 데이터베이스 작업 가이드

## 📋 목차

- [개요](#개요)
- [Prisma 기본 개념](#prisma-기본-개념)
- [스키마 설계](#스키마-설계)
- [마이그레이션](#마이그레이션)
- [쿼리 작성](#쿼리-작성)
- [관계 처리](#관계-처리)
- [성능 최적화](#성능-최적화)
- [실전 예제](#실전-예제)
- [트러블슈팅](#트러블슈팅)

---

## 개요

### Prisma란?

**Prisma**는 TypeScript/JavaScript를 위한 차세대 ORM(Object-Relational Mapping)으로, 타입 안전성과 개발자 경험을 극대화합니다.

### 주요 특징

- ✅ **타입 안전성**: 100% TypeScript 타입 추론
- ✅ **자동 완성**: IDE에서 완벽한 자동 완성 지원
- ✅ **마이그레이션**: 선언적 스키마 기반 마이그레이션
- ✅ **Prisma Studio**: GUI 기반 데이터베이스 관리 도구
- ✅ **N+1 쿼리 방지**: 자동 쿼리 최적화
- ✅ **멀티 DB 지원**: PostgreSQL, MySQL, SQLite, MongoDB 등

### 프로젝트 구조

```
prisma/
├── schema.prisma                # 데이터베이스 스키마 정의
├── migrations/                  # 마이그레이션 히스토리
│   ├── 20251109_init/
│   │   └── migration.sql
│   └── migration_lock.toml
└── seed.ts                      # 시드 데이터 스크립트

src/database/
├── prisma.service.ts            # Prisma 서비스 (NestJS 통합)
├── prisma.module.ts             # Prisma 모듈
└── CLAUDE.md                    # 이 파일
```

---

## Prisma 기본 개념

### 1. Prisma Schema

**위치**: `prisma/schema.prisma`

모든 데이터베이스 구조를 선언적으로 정의하는 파일입니다.

```prisma
// Generator: Prisma Client 생성 설정
generator client {
  provider = "prisma-client-js"
}

// Datasource: 데이터베이스 연결 설정
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Model: 데이터베이스 테이블 정의
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())

  @@map("users")
}
```

### 2. Prisma Client

TypeScript 타입과 함께 자동 생성되는 쿼리 빌더입니다.

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 타입 안전 쿼리
const users = await prisma.user.findMany({
  where: { isActive: true },
  include: { profile: true },
});
// users의 타입: (User & { profile: Profile | null })[]
```

### 3. PrismaService

**위치**: `src/database/prisma.service.ts`

NestJS와 Prisma Client를 통합하는 서비스입니다.

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * 모듈 초기화 시 데이터베이스 연결
   */
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected');
    } catch (error) {
      console.warn('⚠️  Database connection failed, continuing without database');
    }
  }

  /**
   * 모듈 종료 시 데이터베이스 연결 해제
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**사용 방법**:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }
}
```

---

## 스키마 설계

### 1. 기본 모델 정의

```prisma
model User {
  // 필드 정의
  id        String   @id @default(uuid())  // Primary Key, UUID 자동 생성
  name      String                         // 필수 문자열
  email     String   @unique               // 고유 제약 조건
  age       Int?                           // 선택적 정수 (nullable)
  isActive  Boolean  @default(true)        // 기본값 true
  createdAt DateTime @default(now())       // 생성 시각 자동 설정
  updatedAt DateTime @updatedAt            // 수정 시각 자동 업데이트

  // 테이블 이름 매핑
  @@map("users")

  // 인덱스 설정 (성능 최적화)
  @@index([email])
  @@index([createdAt])
}
```

### 2. 필드 타입

| Prisma 타입 | PostgreSQL 타입 | TypeScript 타입 | 설명 |
|-------------|-----------------|-----------------|------|
| `String` | `TEXT` | `string` | 문자열 |
| `Int` | `INTEGER` | `number` | 정수 |
| `Float` | `DOUBLE PRECISION` | `number` | 실수 |
| `Boolean` | `BOOLEAN` | `boolean` | 불리언 |
| `DateTime` | `TIMESTAMP` | `Date` | 날짜/시간 |
| `Json` | `JSONB` | `any` | JSON 객체 |
| `Bytes` | `BYTEA` | `Buffer` | 바이너리 데이터 |
| `Decimal` | `DECIMAL` | `Decimal` | 고정 소수점 |
| `BigInt` | `BIGINT` | `bigint` | 큰 정수 |

### 3. 속성 (Attributes)

#### 필드 속성

| 속성 | 설명 | 예시 |
|------|------|------|
| `@id` | Primary Key | `id String @id` |
| `@unique` | 고유 제약 조건 | `email String @unique` |
| `@default(value)` | 기본값 | `isActive Boolean @default(true)` |
| `@default(uuid())` | UUID 자동 생성 | `id String @id @default(uuid())` |
| `@default(now())` | 현재 시각 | `createdAt DateTime @default(now())` |
| `@updatedAt` | 수정 시각 자동 업데이트 | `updatedAt DateTime @updatedAt` |
| `@relation` | 관계 정의 | `author User @relation(fields: [authorId], references: [id])` |

#### 블록 속성

| 속성 | 설명 | 예시 |
|------|------|------|
| `@@map("table_name")` | 테이블 이름 매핑 | `@@map("users")` |
| `@@index([field])` | 인덱스 생성 | `@@index([email])` |
| `@@unique([field1, field2])` | 복합 고유 제약 | `@@unique([email, deletedAt])` |
| `@@id([field1, field2])` | 복합 Primary Key | `@@id([userId, roleId])` |

### 4. 관계 정의

#### One-to-One (1:1)

```prisma
model User {
  id      String   @id @default(uuid())
  profile Profile? // 선택적 관계 (User는 Profile이 없을 수도 있음)

  @@map("users")
}

model Profile {
  id     String @id @default(uuid())
  userId String @unique // UNIQUE 제약 조건 → 1:1 관계
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}
```

#### One-to-Many (1:N)

```prisma
model User {
  id    String @id @default(uuid())
  posts Post[] // User는 여러 Post를 가질 수 있음

  @@map("users")
}

model Post {
  id       String @id @default(uuid())
  authorId String
  author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@map("posts")
  @@index([authorId])
}
```

#### Many-to-Many (N:M)

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

// Prisma가 자동으로 생성하는 중간 테이블:
// _PostToTag (postId, tagId)
```

**명시적 중간 테이블** (추가 필드 필요 시):
```prisma
model Post {
  id          String       @id @default(uuid())
  postOnTags  PostOnTag[]

  @@map("posts")
}

model Tag {
  id         String      @id @default(uuid())
  name       String      @unique
  postOnTags PostOnTag[]

  @@map("tags")
}

model PostOnTag {
  postId    String
  tagId     String
  assignedAt DateTime @default(now())
  assignedBy String?

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("posts_on_tags")
}
```

### 5. Cascade 설정

```prisma
model User {
  id    String @id @default(uuid())
  posts Post[]

  @@map("users")
}

model Post {
  id       String @id @default(uuid())
  authorId String
  author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)
  //                                                                 ↑
  //                                                  User 삭제 시 Post도 자동 삭제

  @@map("posts")
}
```

**onDelete 옵션**:
- `Cascade`: 부모 삭제 시 자식도 삭제
- `SetNull`: 부모 삭제 시 자식의 FK를 NULL로 설정
- `Restrict`: 자식이 있으면 부모 삭제 불가 (기본값)
- `NoAction`: 데이터베이스 기본 동작

---

## 마이그레이션

### 1. 개발 워크플로우

```bash
# 1. schema.prisma 수정
# 2. 마이그레이션 생성 및 적용
pnpm prisma:migrate

# 3. Prisma Client 재생성 (자동)
# 4. TypeScript 타입 재생성 완료
```

### 2. 마이그레이션 명령어

```bash
# 개발 환경: 마이그레이션 생성 및 즉시 적용
pnpm prisma migrate dev --name add_user_age

# 프로덕션 환경: 마이그레이션 적용만 (새 마이그레이션 생성 X)
pnpm prisma migrate deploy

# 마이그레이션 상태 확인
pnpm prisma migrate status

# 마이그레이션 되돌리기 (주의: 데이터 손실 가능)
pnpm prisma migrate reset
```

### 3. 마이그레이션 파일 구조

```sql
-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");
```

### 4. 프로덕션 배포 체크리스트

- [ ] 로컬에서 마이그레이션 테스트 완료
- [ ] 백업 생성 (`pg_dump` 등)
- [ ] `prisma migrate deploy` 실행
- [ ] 마이그레이션 성공 확인
- [ ] 애플리케이션 재시작
- [ ] 롤백 계획 준비

---

## 쿼리 작성

### 1. CRUD 기본 작업

#### Create (생성)

```typescript
// 단일 생성
const user = await prisma.user.create({
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password',
  },
});

// 다중 생성
const users = await prisma.user.createMany({
  data: [
    { name: 'John', email: 'john@example.com', password: 'hash1' },
    { name: 'Jane', email: 'jane@example.com', password: 'hash2' },
  ],
  skipDuplicates: true, // 중복 건너뛰기
});
```

#### Read (조회)

```typescript
// 전체 조회
const users = await prisma.user.findMany();

// 조건 조회
const activeUsers = await prisma.user.findMany({
  where: {
    isActive: true,
    age: { gte: 18 }, // 18세 이상
  },
});

// 단일 조회 (Primary Key)
const user = await prisma.user.findUnique({
  where: { id: '123' },
});

// 단일 조회 (조건)
const user = await prisma.user.findFirst({
  where: { email: 'john@example.com' },
});

// 존재 여부 확인
const exists = await prisma.user.findUnique({
  where: { id: '123' },
  select: { id: true },
});
```

#### Update (수정)

```typescript
// 단일 수정
const user = await prisma.user.update({
  where: { id: '123' },
  data: {
    name: 'Jane Doe',
    age: 30,
  },
});

// 다중 수정
const result = await prisma.user.updateMany({
  where: { isActive: false },
  data: { deletedAt: new Date() },
});

// Upsert (있으면 수정, 없으면 생성)
const user = await prisma.user.upsert({
  where: { email: 'john@example.com' },
  update: { name: 'John Updated' },
  create: {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hash',
  },
});
```

#### Delete (삭제)

```typescript
// 단일 삭제
const user = await prisma.user.delete({
  where: { id: '123' },
});

// 다중 삭제
const result = await prisma.user.deleteMany({
  where: { isActive: false },
});
```

### 2. 필터링 연산자

```typescript
const users = await prisma.user.findMany({
  where: {
    // 같음
    name: 'John',
    // 또는
    name: { equals: 'John' },

    // 같지 않음
    name: { not: 'John' },

    // 포함 (배열)
    role: { in: ['admin', 'moderator'] },
    role: { notIn: ['banned'] },

    // 문자열 검색
    name: { contains: 'John' },      // LIKE '%John%'
    name: { startsWith: 'John' },    // LIKE 'John%'
    name: { endsWith: 'Doe' },       // LIKE '%Doe'

    // 숫자/날짜 비교
    age: { gt: 18 },                 // >18
    age: { gte: 18 },                // >=18
    age: { lt: 65 },                 // <65
    age: { lte: 65 },                // <=65

    // NULL 체크
    deletedAt: null,
    deletedAt: { isSet: false },

    // AND 조건 (기본)
    AND: [
      { isActive: true },
      { age: { gte: 18 } },
    ],

    // OR 조건
    OR: [
      { email: { contains: '@gmail.com' } },
      { email: { contains: '@yahoo.com' } },
    ],

    // NOT 조건
    NOT: {
      email: { contains: '@spam.com' },
    },
  },
});
```

### 3. 정렬 및 페이지네이션

```typescript
const users = await prisma.user.findMany({
  // 정렬
  orderBy: [
    { isActive: 'desc' },      // 활성 사용자 먼저
    { createdAt: 'desc' },     // 최신순
    { name: 'asc' },           // 이름 오름차순
  ],

  // 페이지네이션
  skip: 20,  // 첫 20개 건너뛰기 (offset)
  take: 10,  // 10개만 조회 (limit)
});

// 페이지 번호 방식
const page = 2;
const pageSize = 10;

const users = await prisma.user.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// 커서 기반 페이지네이션 (더 효율적)
const users = await prisma.user.findMany({
  take: 10,
  cursor: { id: 'last-id-from-previous-page' },
  skip: 1, // 커서 자체는 제외
});
```

### 4. 필드 선택 (Sparse Fieldsets)

```typescript
// 특정 필드만 선택
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    // password는 선택하지 않음 (보안)
  },
});

// 특정 필드 제외 (나머지 모두 포함)
const users = await prisma.user.findMany({
  omit: {
    password: true,
  },
});
```

---

## 관계 처리

### 1. Include (관계 포함)

```typescript
// 단일 관계 포함
const user = await prisma.user.findUnique({
  where: { id: '123' },
  include: {
    profile: true,  // User의 Profile 포함
  },
});
// 타입: User & { profile: Profile | null }

// 다중 관계 포함
const user = await prisma.user.findUnique({
  where: { id: '123' },
  include: {
    profile: true,
    posts: true,  // User의 모든 Post 포함
  },
});
// 타입: User & { profile: Profile | null, posts: Post[] }

// 중첩 관계 포함
const user = await prisma.user.findUnique({
  where: { id: '123' },
  include: {
    posts: {
      include: {
        comments: true,  // Post의 Comment까지 포함
      },
    },
  },
});
```

### 2. Select (필드 선택 + 관계)

```typescript
const user = await prisma.user.findUnique({
  where: { id: '123' },
  select: {
    id: true,
    name: true,
    profile: {
      select: {
        bio: true,
        avatar: true,
      },
    },
    posts: {
      select: {
        title: true,
        published: true,
      },
      where: {
        published: true,  // 발행된 게시글만
      },
      orderBy: {
        createdAt: 'desc',  // 최신순
      },
      take: 5,  // 최대 5개
    },
  },
});
```

### 3. N+1 쿼리 문제 해결

#### ❌ N+1 쿼리 발생 (나쁜 예)

```typescript
// 1번 쿼리: 모든 사용자 조회
const users = await prisma.user.findMany();

// N번 쿼리: 각 사용자의 프로필 조회
for (const user of users) {
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
}
// → 총 1 + N번 쿼리 실행 (users 100개 → 101번 쿼리)
```

#### ✅ Eager Loading (좋은 예)

```typescript
// 단 1번의 JOIN 쿼리로 해결
const users = await prisma.user.findMany({
  include: {
    profile: true,  // LEFT JOIN profiles
  },
});
// → 총 1번 쿼리 실행
```

---

## 성능 최적화

### 1. 인덱스 설정

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique          // 자동 인덱스 생성
  name      String
  createdAt DateTime @default(now())

  @@index([email])                    // 명시적 인덱스
  @@index([createdAt])                // 날짜 검색 최적화
  @@index([name, createdAt])          // 복합 인덱스
  @@map("users")
}
```

**인덱스 생성 기준**:
- ✅ WHERE 절에서 자주 사용되는 필드
- ✅ JOIN/관계에서 사용되는 외래 키
- ✅ ORDER BY에서 사용되는 필드
- ❌ 너무 많은 인덱스 (INSERT/UPDATE 성능 저하)

### 2. 쿼리 최적화

```typescript
// ❌ 비효율적
const users = await prisma.user.findMany();
const count = users.length;

// ✅ 효율적
const count = await prisma.user.count();
```

```typescript
// ❌ 비효율적 (모든 필드 조회)
const users = await prisma.user.findMany();

// ✅ 효율적 (필요한 필드만)
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});
```

### 3. 트랜잭션

```typescript
// 순차 트랜잭션
const [user, profile] = await prisma.$transaction([
  prisma.user.create({ data: { name: 'John', email: 'john@example.com' } }),
  prisma.profile.create({ data: { userId: '...', bio: 'Hello' } }),
]);

// 인터랙티브 트랜잭션
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { name: 'John', email: 'john@example.com' },
  });

  const profile = await tx.profile.create({
    data: { userId: user.id, bio: 'Hello' },
  });

  // 조건부 롤백
  if (!user.isActive) {
    throw new Error('사용자가 비활성화되었습니다.');
  }
});
```

### 4. Raw 쿼리 (복잡한 쿼리)

```typescript
// 원시 SQL 쿼리
const users = await prisma.$queryRaw`
  SELECT * FROM users
  WHERE age >= ${18}
  AND email LIKE ${'%@gmail.com'}
`;

// Execute (결과 반환 안 함)
await prisma.$executeRaw`
  UPDATE users
  SET is_active = false
  WHERE last_login < NOW() - INTERVAL '1 year'
`;
```

---

## 실전 예제

### 예제 1: Soft Delete 구현

```prisma
model User {
  id        String    @id @default(uuid())
  name      String
  email     String    @unique
  deletedAt DateTime? // NULL이면 활성, 값이 있으면 삭제됨

  @@map("users")
}
```

```typescript
// 서비스
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Soft Delete
  async softDelete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // 활성 사용자만 조회
  async findAllActive() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
    });
  }

  // 삭제된 사용자 복구
  async restore(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
```

### 예제 2: 전체 텍스트 검색

```typescript
// PostgreSQL 전체 텍스트 검색
const posts = await prisma.$queryRaw`
  SELECT * FROM posts
  WHERE to_tsvector('english', title || ' ' || content) @@ to_tsquery('english', ${searchQuery})
  ORDER BY ts_rank(to_tsvector('english', title || ' ' || content), to_tsquery('english', ${searchQuery})) DESC
  LIMIT 10
`;
```

### 예제 3: 집계 쿼리

```typescript
// 그룹별 집계
const stats = await prisma.user.groupBy({
  by: ['role'],
  _count: {
    id: true,
  },
  _avg: {
    age: true,
  },
});
// 결과: [{ role: 'admin', _count: { id: 5 }, _avg: { age: 35.2 } }, ...]

// 전체 집계
const aggregate = await prisma.user.aggregate({
  _count: true,
  _avg: { age: true },
  _sum: { age: true },
  _min: { createdAt: true },
  _max: { createdAt: true },
});
```

---

## 트러블슈팅

### 1. "Type 'User' is not assignable to type..." 에러

**원인**: Prisma Client가 재생성되지 않음

**해결**:
```bash
pnpm prisma:generate
```

### 2. 마이그레이션 충돌

**원인**: 로컬과 원격 마이그레이션 불일치

**해결**:
```bash
# 마이그레이션 상태 확인
pnpm prisma migrate status

# 마이그레이션 리셋 (개발 환경만)
pnpm prisma migrate reset

# 프로덕션: 수동 해결 필요
```

### 3. "Unique constraint failed" 에러

**원인**: UNIQUE 제약 조건 위반

**해결**:
```typescript
// 중복 확인 후 생성
const existing = await prisma.user.findUnique({
  where: { email: 'john@example.com' },
});

if (existing) {
  throw new ConflictException('이미 존재하는 이메일입니다.');
}

const user = await prisma.user.create({
  data: { name: 'John', email: 'john@example.com' },
});
```

### 4. 연결 풀 고갈

**원인**: `$connect()` 후 `$disconnect()` 누락

**해결**:
```typescript
// ❌ 잘못된 예
const prisma = new PrismaClient();
await prisma.$connect();
// $disconnect() 누락

// ✅ 올바른 예 (PrismaService 사용)
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect(); // 자동 해제
  }
}
```

---

## 참고 자료

### 공식 문서
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

### 관련 문서
- [프로젝트 CLAUDE.md](../../CLAUDE.md) - 전체 프로젝트 가이드
- [PRISMA.md](../../PRISMA.md) - Prisma 사용 가이드

### 핵심 파일 위치
- Prisma 스키마: `prisma/schema.prisma`
- Prisma 서비스: `src/database/prisma.service.ts`
- 마이그레이션: `prisma/migrations/`

---

**마지막 업데이트**: 2025-11-09
**버전**: 1.0.0
**작성자**: Claude Code
