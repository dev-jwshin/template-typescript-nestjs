# Prisma 가이드

이 프로젝트는 [Prisma](https://www.prisma.io/)를 ORM으로 사용하여 PostgreSQL 데이터베이스와 통신합니다.

## 📖 목차

- [개요](#개요)
- [설정](#설정)
- [스키마 정의](#스키마-정의)
- [마이그레이션](#마이그레이션)
- [Prisma Client 사용](#prisma-client-사용)
- [모범 사례](#모범-사례)

## 개요

### Prisma란?

Prisma는 Node.js와 TypeScript를 위한 차세대 ORM입니다:

- **타입 안전성**: 자동 생성된 타입으로 완벽한 타입 안전성 제공
- **직관적인 API**: 가독성 높은 쿼리 작성
- **마이그레이션 시스템**: 데이터베이스 스키마 버전 관리
- **Prisma Studio**: 내장 데이터베이스 GUI

### 프로젝트 구조

```
├── prisma/
│   ├── schema.prisma      # 데이터베이스 스키마 정의
│   ├── migrations/        # 마이그레이션 파일
│   └── seed.ts           # 시드 데이터 (선택사항)
├── src/
│   └── database/
│       ├── prisma.module.ts   # Prisma 모듈
│       └── prisma.service.ts  # Prisma 서비스
```

## 설정

### 1. 환경 변수 설정

`.env` 파일에 데이터베이스 URL 설정:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nestjs_db"
```

### 2. Prisma Client 생성

```bash
pnpm prisma:generate
```

### 3. 데이터베이스 마이그레이션

```bash
# 개발 환경
pnpm prisma:migrate

# 프로덕션 환경
pnpm prisma:migrate:deploy
```

## 스키마 정의

### 기본 구조

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

### 모델 작성 팁

**1. 필드 타입**
```prisma
model Example {
  stringField   String
  intField      Int
  floatField    Float
  boolField     Boolean
  dateField     DateTime
  jsonField     Json
  optionalField String?      // 선택적 필드
}
```

**2. 기본값과 자동 생성**
```prisma
model Example {
  id        String   @id @default(uuid())      // UUID 자동 생성
  createdAt DateTime @default(now())           // 현재 시간
  updatedAt DateTime @updatedAt                // 자동 업데이트
  isActive  Boolean  @default(true)            // 기본값
}
```

**3. 관계 설정**
```prisma
model User {
  id    String  @id @default(uuid())
  posts Post[]  // 1:N 관계
}

model Post {
  id       String @id @default(uuid())
  userId   String
  user     User   @relation(fields: [userId], references: [id])
}
```

**4. 인덱스와 제약조건**
```prisma
model User {
  email String @unique                    // 고유 제약조건
  name  String @db.VarChar(100)          // 타입 명시

  @@index([email])                        // 인덱스
  @@unique([firstName, lastName])        // 복합 고유 제약조건
}
```

## 마이그레이션

### 마이그레이션 생성

스키마 변경 후:

```bash
pnpm prisma:migrate
```

마이그레이션 이름 입력:
```
✔ Enter a name for the new migration: … add_user_role_field
```

### 마이그레이션 파일

생성된 파일: `prisma/migrations/20250107_add_user_role_field/migration.sql`

```sql
-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
```

### 마이그레이션 적용

```bash
# 개발 환경 (마이그레이션 생성 + 적용)
pnpm prisma:migrate

# 프로덕션 환경 (마이그레이션만 적용)
pnpm prisma:migrate:deploy

# 마이그레이션 상태 확인
pnpm prisma migrate status
```

### 데이터베이스 초기화

⚠️ **주의: 모든 데이터가 삭제됩니다**

```bash
pnpm db:reset
```

이 명령어는:
1. 데이터베이스 삭제
2. 데이터베이스 재생성
3. 모든 마이그레이션 적용
4. 시드 데이터 실행 (있는 경우)

## Prisma Client 사용

### NestJS 서비스에서 사용

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 생성
  async create(data: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
    });
  }

  // 조회 (단일)
  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // 조회 (목록)
  async findAll() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      skip: 0,
    });
  }

  // 수정
  async update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // 삭제
  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
```

### 고급 쿼리

**필터링**
```typescript
const users = await prisma.user.findMany({
  where: {
    AND: [
      { isActive: true },
      { email: { contains: '@example.com' } },
      { createdAt: { gte: new Date('2025-01-01') } },
    ],
  },
});
```

**정렬**
```typescript
const users = await prisma.user.findMany({
  orderBy: [
    { isActive: 'desc' },
    { createdAt: 'desc' },
  ],
});
```

**페이지네이션**
```typescript
const page = 1;
const pageSize = 10;

const [users, total] = await Promise.all([
  prisma.user.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
  }),
  prisma.user.count(),
]);
```

**관계 포함**
```typescript
const userWithPosts = await prisma.user.findUnique({
  where: { id },
  include: {
    posts: true,
  },
});
```

**특정 필드만 선택**
```typescript
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});
```

**트랜잭션**
```typescript
await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.post.create({ data: postData }),
]);

// 또는 인터랙티브 트랜잭션
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.post.create({
    data: { ...postData, userId: user.id },
  });
});
```

## 모범 사례

### 1. PrismaService를 Global로 설정

`src/database/prisma.module.ts`:
```typescript
@Global()  // 전역 모듈로 설정
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 2. 비밀번호는 응답에서 제외

```typescript
const user = await prisma.user.create({ data });
const { password, ...userWithoutPassword } = user;
return userWithoutPassword;
```

또는:
```typescript
const user = await prisma.user.create({
  data,
  select: {
    id: true,
    name: true,
    email: true,
    // password 필드 제외
  },
});
```

### 3. 에러 처리

```typescript
import { Prisma } from '@prisma/client';

try {
  await prisma.user.create({ data });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (error.code === 'P2002') {
      throw new ConflictException('이메일이 이미 존재합니다.');
    }
  }
  throw error;
}
```

### 4. 소프트 삭제 구현

```prisma
model User {
  id        String    @id @default(uuid())
  deletedAt DateTime?
}
```

```typescript
// 소프트 삭제
async softDelete(id: string) {
  return this.prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// 삭제되지 않은 항목만 조회
async findAll() {
  return this.prisma.user.findMany({
    where: { deletedAt: null },
  });
}
```

### 5. 연결 풀 최적화

프로덕션 환경에서:

```env
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=10&pool_timeout=20"
```

## 유용한 도구

### Prisma Studio

데이터베이스 GUI 실행:

```bash
pnpm prisma:studio
```

브라우저에서 `http://localhost:5555` 접속

### Prisma Format

스키마 파일 포맷팅:

```bash
pnpm prisma format
```

### 스키마 검증

```bash
pnpm prisma validate
```

## 참고 자료

- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Prisma와 NestJS 통합](https://docs.nestjs.com/recipes/prisma)
- [Prisma 스키마 참조](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
