# Common 모듈 가이드

> 프로젝트 전반에서 재사용되는 공통 유틸리티, 패턴, 인프라 가이드

## 📋 목차

- [개요](#개요)
- [폴더 구조](#폴더-구조)
- [핵심 컴포넌트](#핵심-컴포넌트)
- [JSON:API 시스템](#jsonapi-시스템)
- [캐싱 시스템](#캐싱-시스템)
- [에러 처리](#에러-처리)
- [로깅 시스템](#로깅-시스템)
- [커스텀 데코레이터](#커스텀-데코레이터)
- [실전 예제](#실전-예제)

---

## 개요

### Common 모듈이란?

프로젝트 전반에서 재사용되는 공통 기능을 모아놓은 모듈입니다. NestJS의 모듈 시스템을 활용하여 관심사를 분리하고 코드 중복을 최소화합니다.

### 주요 기능

- ✅ **@Crud 데코레이터 시스템**: 보일러플레이트 80% 감소
- ✅ **JSON:API 1.1 완전 준수**: 자동 변환 및 검증
- ✅ **캐싱 시스템**: Redis/Memory 캐시 지원
- ✅ **에러 처리**: 표준화된 예외 필터
- ✅ **로깅**: 요청/응답 자동 로깅
- ✅ **커스텀 데코레이터**: 재사용 가능한 데코레이터
- ✅ **유틸리티 함수**: 헬퍼 함수 모음

---

## 폴더 구조

```
src/common/
│
├── 📂 cache/                              # 캐싱 시스템
│   ├── stores/                            # 캐시 저장소 구현체
│   │   ├── memory.store.ts                # 메모리 캐시
│   │   └── redis.store.ts                 # Redis 캐시
│   ├── interfaces/                        # 캐시 인터페이스
│   │   └── cache-store.interface.ts
│   ├── cache.factory.ts                   # 캐시 팩토리
│   ├── cache.module.ts                    # 캐시 모듈
│   └── index.ts
│
├── 📂 crud/                               # @Crud 데코레이터 시스템
│   ├── builders/                          # 쿼리 빌더
│   │   └── prisma-query.builder.ts        # Prisma 쿼리 빌더
│   ├── decorators/                        # CRUD 데코레이터
│   │   ├── crud.decorator.ts              # @Crud 데코레이터
│   │   ├── hook.decorator.ts              # 훅 데코레이터
│   │   └── param.decorator.ts             # 파라미터 데코레이터
│   ├── factories/                         # 라우트 팩토리
│   │   └── crud-route.factory.ts          # 라우트 자동 생성
│   ├── interceptors/                      # CRUD 인터셉터
│   │   └── crud-cache.interceptor.ts      # 캐시 인터셉터
│   ├── metadata/                          # 메타데이터 저장소
│   │   ├── crud-metadata.storage.ts
│   │   └── crud-hook-metadata.storage.ts
│   ├── plugins/                           # CRUD 플러그인
│   │   ├── audit-log.plugin.ts            # 감사 로그
│   │   ├── rate-limit.plugin.ts           # Rate Limiting
│   │   └── caching.plugin.ts              # 캐싱 플러그인
│   ├── services/                          # CRUD 서비스
│   │   ├── crud-base.service.ts           # 베이스 서비스
│   │   ├── crud-hook-executor.service.ts  # 훅 실행기
│   │   └── crud-performance.service.ts    # 성능 최적화
│   ├── types/                             # CRUD 타입 정의
│   │   ├── crud-config.interface.ts
│   │   ├── crud-operation.enum.ts
│   │   ├── filter-operator.type.ts
│   │   └── ...
│   ├── index.ts
│   └── CLAUDE.md                          # @Crud 시스템 상세 가이드
│
├── 📂 decorators/                         # 커스텀 데코레이터
│   ├── jsonapi-resource.decorator.ts      # JSON:API 리소스
│   └── jsonapi-query.decorator.ts         # JSON:API 쿼리
│
├── 📂 dto/                                # 공통 DTO
│   └── jsonapi-query.dto.ts               # JSON:API 쿼리 DTO
│
├── 📂 filters/                            # 예외 필터
│   ├── http-exception.filter.ts           # HTTP 예외 필터
│   └── jsonapi-exception.filter.ts        # JSON:API 예외 필터
│
├── 📂 interceptors/                       # 인터셉터
│   ├── logging.interceptor.ts             # 로깅 인터셉터
│   └── jsonapi-transform.interceptor.ts   # JSON:API 변환 인터셉터
│
├── 📂 interfaces/                         # 공통 인터페이스
│   ├── response.interface.ts              # 응답 인터페이스
│   └── jsonapi.interface.ts               # JSON:API 인터페이스
│
├── 📂 middlewares/                        # 미들웨어
│   └── jsonapi-transform.middleware.ts    # JSON:API 변환 미들웨어
│
├── 📂 pipes/                              # 파이프
│   ├── parse-uuid.pipe.ts                 # UUID 파싱 파이프
│   └── jsonapi-validation.pipe.ts         # JSON:API 검증 파이프
│
├── 📂 types/                              # 공통 타입 정의
│   └── environment.d.ts                   # 환경 변수 타입
│
├── 📂 utils/                              # 유틸리티 함수
│   └── jsonapi-helper.ts                  # JSON:API 헬퍼
│
└── CLAUDE.md                              # 이 파일
```

---

## 핵심 컴포넌트

### 1. @Crud 데코레이터 시스템

**위치**: `src/common/crud/`

**설명**: 보일러플레이트 코드를 80% 줄이는 선언적 CRUD 시스템

**상세 가이드**: [crud/CLAUDE.md](./crud/CLAUDE.md)

**사용 예시**:
```typescript
import { Crud, CrudOperation } from '../common/crud';

@Crud({
  only: [CrudOperation.Index, CrudOperation.Show],
  resourceType: 'users',
  allowedFilters: { name: ['eq', 'like'] },
  pagination: { defaultLimit: 20 },
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

### 2. JSON:API Transform 시스템

**위치**: `src/common/interceptors/jsonapi-transform.interceptor.ts`

**설명**: NestJS 응답을 JSON:API 1.1 형식으로 자동 변환

**글로벌 등록** (`src/app.module.ts`):
```typescript
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: JsonApiTransformInterceptor,
    },
  ],
})
export class AppModule {}
```

**변환 예시**:
```typescript
// 컨트롤러 응답
return {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
};

// JSON:API 자동 변환 후
{
  "jsonapi": { "version": "1.1" },
  "data": {
    "type": "users",
    "id": "123",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### 3. 캐싱 시스템

**위치**: `src/common/cache/`

**설명**: Redis 또는 메모리 기반 캐싱 지원

**사용 예시**:
```typescript
import { CacheService } from '../common/cache';

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

## JSON:API 시스템

### 1. JsonApiTransformInterceptor

**위치**: `src/common/interceptors/jsonapi-transform.interceptor.ts`

**역할**: NestJS 응답을 JSON:API 1.1 형식으로 자동 변환

**동작 과정**:
```
컨트롤러 응답
    ↓
JsonApiTransformInterceptor
    ↓
JsonApiHelper.transform()
    ↓
JSON:API 1.1 형식 응답
    ↓
클라이언트
```

**지원 기능**:
- ✅ 단일 리소스 변환
- ✅ 리소스 컬렉션 변환
- ✅ 페이지네이션 메타데이터
- ✅ 관계(Relationships) 포함
- ✅ Included 리소스
- ✅ 에러 응답 변환

### 2. JsonApiExceptionFilter

**위치**: `src/common/filters/jsonapi-exception.filter.ts`

**역할**: NestJS 예외를 JSON:API 에러 형식으로 변환

**에러 응답 예시**:
```json
{
  "jsonapi": { "version": "1.1" },
  "errors": [
    {
      "status": "404",
      "title": "Not Found",
      "detail": "User ID 123를 찾을 수 없습니다.",
      "source": {
        "pointer": "/data/id"
      }
    }
  ]
}
```

**글로벌 등록** (`src/main.ts`):
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new JsonApiExceptionFilter());
  await app.listen(3000);
}
```

### 3. JsonApiValidationPipe

**위치**: `src/common/pipes/jsonapi-validation.pipe.ts`

**역할**: JSON:API 요청 Body 검증 및 추출

**사용 예시**:
```typescript
@Post()
async create(@Body() body: any) {
  // body.data.attributes가 자동으로 추출됨
  const createDto = body.data.attributes;
  return this.usersService.create(createDto);
}
```

### 4. JsonApiHelper

**위치**: `src/common/utils/jsonapi-helper.ts`

**역할**: JSON:API 변환 헬퍼 함수

**주요 메서드**:
```typescript
// 단일 리소스 변환
JsonApiHelper.transform(data, 'users');

// 컬렉션 변환
JsonApiHelper.transformCollection(data, 'users', meta);

// 에러 변환
JsonApiHelper.transformError(error);
```

---

## 캐싱 시스템

### 1. 아키텍처

```
CacheModule (DynamicModule)
    ↓
CacheFactory
    ↓
├── RedisStore (CACHE_ENABLED=true)
└── MemoryStore (CACHE_ENABLED=false)
    ↓
CacheService (추상화)
```

### 2. 환경 변수 설정

```env
# .env
CACHE_ENABLED=true          # 캐시 활성화 여부
REDIS_HOST=localhost        # Redis 호스트
REDIS_PORT=6379             # Redis 포트
REDIS_PASSWORD=             # Redis 비밀번호 (선택)
REDIS_DB=0                  # Redis DB 번호
CACHE_TTL=3600              # 기본 TTL (초)
```

### 3. 사용 예시

#### 기본 사용

```typescript
import { CacheService } from '../common/cache';

@Injectable()
export class UsersService {
  constructor(private readonly cacheService: CacheService) {}

  async findOne(id: string) {
    const cacheKey = `user:${id}`;

    // 캐시 조회
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      console.log('Cache hit');
      return cached;
    }

    // DB 조회
    const user = await this.prisma.user.findUnique({ where: { id } });

    // 캐시 저장 (1시간)
    await this.cacheService.set(cacheKey, user, 3600);

    return user;
  }

  async update(id: string, updateDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateDto,
    });

    // 캐시 무효화
    await this.cacheService.del(`user:${id}`);

    return user;
  }
}
```

#### 캐시 패턴별 사용

```typescript
// 1. Cache-Aside (Lazy Loading)
async findOne(id: string) {
  const cached = await this.cache.get(`user:${id}`);
  if (cached) return cached;

  const user = await this.db.find(id);
  await this.cache.set(`user:${id}`, user, 3600);
  return user;
}

// 2. Write-Through (동시 업데이트)
async update(id: string, data: any) {
  const user = await this.db.update(id, data);
  await this.cache.set(`user:${id}`, user, 3600); // 즉시 캐시 업데이트
  return user;
}

// 3. Write-Behind (비동기 업데이트)
async update(id: string, data: any) {
  await this.cache.set(`user:${id}`, data, 3600);
  this.queue.add({ id, data }); // 비동기 DB 업데이트
}
```

### 4. CachingPlugin

**위치**: `src/common/crud/plugins/caching.plugin.ts`

**설명**: @Crud 데코레이터에서 자동 캐싱

**사용 예시**:
```typescript
import { CachingPlugin } from '../common/crud/plugins/caching.plugin';

@Crud({
  only: [CrudOperation.Index, CrudOperation.Show],
  plugins: [
    new CachingPlugin({
      ttl: 3600,       // 1시간 캐싱
      keyPrefix: 'users:',
    }),
  ],
})
@Controller('users')
export class UsersController {}
```

---

## 에러 처리

### 1. HttpExceptionFilter

**위치**: `src/common/filters/http-exception.filter.ts`

**역할**: 표준 HTTP 예외 처리

**사용 예시**:
```typescript
throw new NotFoundException('사용자를 찾을 수 없습니다.');
throw new BadRequestException('잘못된 요청입니다.');
throw new UnauthorizedException('인증이 필요합니다.');
throw new ForbiddenException('권한이 없습니다.');
```

### 2. JsonApiExceptionFilter

**위치**: `src/common/filters/jsonapi-exception.filter.ts`

**역할**: JSON:API 에러 형식 변환

**에러 응답 형식**:
```json
{
  "jsonapi": { "version": "1.1" },
  "errors": [
    {
      "status": "400",
      "title": "Bad Request",
      "detail": "이메일 형식이 올바르지 않습니다.",
      "source": {
        "pointer": "/data/attributes/email"
      }
    }
  ]
}
```

### 3. 커스텀 예외 생성

```typescript
// src/common/exceptions/custom.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class DuplicateEmailException extends HttpException {
  constructor(email: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: `이메일 ${email}는 이미 사용 중입니다.`,
        error: 'Duplicate Email',
      },
      HttpStatus.CONFLICT,
    );
  }
}

// 사용
throw new DuplicateEmailException('john@example.com');
```

---

## 로깅 시스템

### 1. LoggingInterceptor

**위치**: `src/common/interceptors/logging.interceptor.ts`

**역할**: 요청/응답 자동 로깅

**로그 출력 예시**:
```
[LoggingInterceptor] GET /api/users - Start
[LoggingInterceptor] GET /api/users - End - 45ms
```

**글로벌 등록**:
```typescript
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

### 2. 커스텀 로거

```typescript
// src/common/utils/logger.ts
import { Logger } from '@nestjs/common';

export class CustomLogger extends Logger {
  error(message: string, trace?: string, context?: string) {
    // 외부 로깅 서비스로 전송 (예: Sentry)
    super.error(message, trace, context);
  }
}
```

---

## 커스텀 데코레이터

### 1. @JsonApiResource

**위치**: `src/common/decorators/jsonapi-resource.decorator.ts`

**역할**: JSON:API 리소스 타입 지정

**사용 예시**:
```typescript
@JsonApiResource('users')
@Controller('users')
export class UsersController {}
```

### 2. @JsonApiQuery

**위치**: `src/common/decorators/jsonapi-query.decorator.ts`

**역할**: JSON:API 쿼리 파라미터 추출

**사용 예시**:
```typescript
@Get()
async findAll(@JsonApiQuery() query: JsonApiQueryDto) {
  return this.usersService.findAll({
    filter: query.filter,
    sort: query.sort,
    page: query.page,
    include: query.include,
  });
}
```

### 3. 커스텀 데코레이터 생성

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // JWT 토큰에서 추출된 사용자 정보
  },
);

// 사용
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  return user;
}
```

---

## 실전 예제

### 예제 1: 캐시 적용 CRUD

```typescript
import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../common/crud/services/crud-base.service';
import { CacheService } from '../../common/cache';
import { PrismaService } from '../../database/prisma.service';
import { User } from './user.entity';

@Injectable()
export class UsersService extends CrudBaseService<User> {
  constructor(
    prisma: PrismaService,
    private readonly cache: CacheService,
  ) {
    super(prisma, 'user', {
      allowedFilters: { name: ['eq', 'like'] },
      serialize: { exclude: ['password'] },
    });
  }

  /**
   * 캐시 적용 단일 조회
   */
  async findOne(id: string): Promise<User> {
    const cacheKey = `user:${id}`;

    // 캐시 확인
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // DB 조회
    const user = await super.findOne(id);

    // 캐시 저장
    await this.cache.set(cacheKey, user, 3600);

    return user;
  }

  /**
   * 업데이트 시 캐시 무효화
   */
  async update(id: string, updateDto: any): Promise<User> {
    const user = await super.update(id, updateDto);

    // 캐시 무효화
    await this.cache.del(`user:${id}`);

    return user;
  }

  /**
   * 삭제 시 캐시 무효화
   */
  async remove(id: string): Promise<{ message: string }> {
    const result = await super.remove(id);

    // 캐시 무효화
    await this.cache.del(`user:${id}`);

    return result;
  }
}
```

### 예제 2: 커스텀 파이프 생성

```typescript
// src/common/pipes/parse-email.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseEmailPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
      throw new BadRequestException('유효한 이메일 주소를 입력하세요.');
    }

    return value.toLowerCase();
  }
}

// 사용
@Get('search')
async search(@Query('email', ParseEmailPipe) email: string) {
  return this.usersService.findByEmail(email);
}
```

### 예제 3: 커스텀 가드 생성

```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    return true;
  }
}

// 데코레이터
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// 사용
@Get('admin/users')
@UseGuards(RolesGuard)
@Roles('admin', 'moderator')
async adminUsers() {
  return this.usersService.findAll();
}
```

---

## 참고 자료

### 관련 문서
- [프로젝트 CLAUDE.md](../CLAUDE.md) - 전체 프로젝트 가이드
- [@Crud 시스템 가이드](./crud/CLAUDE.md) - @Crud 데코레이터 상세 가이드
- [Users 모듈 가이드](../modules/users/CLAUDE.md) - Users 모듈 개발 가이드
- [Prisma 가이드](../database/CLAUDE.md) - Prisma 및 데이터베이스 가이드

### 핵심 폴더 위치
- CRUD 시스템: `src/common/crud/`
- 캐싱 시스템: `src/common/cache/`
- JSON:API: `src/common/interceptors/jsonapi-transform.interceptor.ts`
- 필터: `src/common/filters/`
- 인터셉터: `src/common/interceptors/`
- 데코레이터: `src/common/decorators/`
- 유틸리티: `src/common/utils/`

---

**마지막 업데이트**: 2025-11-09
**버전**: 1.0.0
**작성자**: Claude Code
