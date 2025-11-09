# I18n 다국어 검증 시스템 가이드

> class-validator 오류 메시지 중앙화 및 다국어 지원

## 📋 목차

- [개요](#개요)
- [아키텍처](#아키텍처)
- [사용 방법](#사용-방법)
- [언어 설정](#언어-설정)
- [지원 검증 타입](#지원-검증-타입)
- [커스터마이징](#커스터마이징)
- [예제](#예제)

---

## 개요

### 주요 기능

- ✅ **중앙화된 검증 메시지**: 모든 class-validator 오류 메시지를 한 곳에서 관리
- ✅ **다국어 지원**: 한국어(ko), 영어(en) 자동 전환
- ✅ **유연한 언어 설정**: 쿼리 파라미터, Accept-Language 헤더, 커스텀 헤더 지원
- ✅ **타입 안전성**: TypeScript로 작성된 완전한 타입 안전 시스템
- ✅ **확장 가능**: 새로운 언어 및 검증 메시지 쉽게 추가

### 시스템 구성

```
src/
├── i18n/                           # 번역 파일
│   ├── ko/
│   │   └── validation.json         # 한국어 검증 메시지
│   └── en/
│       └── validation.json         # 영어 검증 메시지
├── common/
│   └── pipes/
│       └── i18n-validation.pipe.ts # I18n 검증 파이프
├── app.module.ts                   # I18nModule 설정
└── main.ts                         # 전역 파이프 등록
```

---

## 아키텍처

### 동작 순서

```
1. 클라이언트 요청 (with 언어 설정)
   ↓
2. I18nModule (언어 감지)
   ↓
3. I18nValidationPipe (DTO 검증)
   ↓
4. class-validator (검증 수행)
   ↓
5. 오류 메시지 변환 (i18n/[lang]/validation.json)
   ↓
6. BadRequestException (다국어 오류 응답)
   ↓
7. 클라이언트
```

### 핵심 컴포넌트

#### 1. I18nModule (src/app.module.ts)

```typescript
I18nModule.forRoot({
  fallbackLanguage: 'ko', // 기본 언어
  loaderOptions: {
    path: path.join(__dirname, '/i18n/'),
    watch: true,
  },
  resolvers: [
    // ?lang=en 쿼리 파라미터
    { use: QueryResolver, options: ['lang'] },
    // Accept-Language 헤더
    AcceptLanguageResolver,
    // X-Custom-Lang 헤더
    new HeaderResolver(['x-custom-lang']),
  ],
})
```

#### 2. I18nValidationPipe (src/common/pipes/i18n-validation.pipe.ts)

- class-validator 검증 수행
- ValidationError를 다국어 메시지로 변환
- I18nContext를 통한 동적 번역

#### 3. 번역 파일 (src/i18n/[lang]/validation.json)

```json
{
  "validation": {
    "isEmail": "{property}은(는) 유효한 이메일 주소여야 합니다.",
    "isNotEmpty": "{property}은(는) 비어있을 수 없습니다.",
    "minLength": "{property}은(는) 최소 {constraints} 자 이상이어야 합니다."
  },
  "error": {
    "validationFailed": "유효성 검증에 실패했습니다."
  }
}
```

---

## 사용 방법

### 1. DTO 작성

```typescript
import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
```

### 2. 컨트롤러에서 사용

```typescript
@Post()
async create(@Body() createDto: CreateUserDto) {
  // I18nValidationPipe가 자동으로 검증 수행
  return this.service.create(createDto);
}
```

### 3. 오류 응답 예시

**한국어 (기본)**:
```bash
POST /api/users
Content-Type: application/json

{
  "name": "",
  "email": "invalid-email",
  "password": "123"
}
```

**응답**:
```json
{
  "statusCode": 400,
  "message": "유효성 검증에 실패했습니다.",
  "errors": {
    "name": [
      "name은(는) 비어있을 수 없습니다.",
      "name은(는) 최소 2 자 이상이어야 합니다."
    ],
    "email": [
      "email은(는) 유효한 이메일 주소여야 합니다."
    ],
    "password": [
      "password은(는) 최소 8 자 이상이어야 합니다."
    ]
  }
}
```

**영어 (?lang=en)**:
```bash
POST /api/users?lang=en
```

**응답**:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "name": [
      "name should not be empty.",
      "name must be at least 2 characters long."
    ],
    "email": [
      "email must be a valid email address."
    ],
    "password": [
      "password must be at least 8 characters long."
    ]
  }
}
```

---

## 언어 설정

### 방법 1: 쿼리 파라미터 (우선순위 1)

```bash
GET /api/users?lang=en
POST /api/users?lang=ko
```

### 방법 2: Accept-Language 헤더 (우선순위 2)

```bash
curl -H "Accept-Language: en" http://localhost:3000/api/users
curl -H "Accept-Language: ko" http://localhost:3000/api/users
```

### 방법 3: 커스텀 헤더 (우선순위 3)

```bash
curl -H "X-Custom-Lang: en" http://localhost:3000/api/users
```

### 우선순위 순서

1. `?lang=en` (QueryResolver)
2. `Accept-Language: en` (AcceptLanguageResolver)
3. `X-Custom-Lang: en` (HeaderResolver)
4. 기본 언어 (ko)

---

## 지원 검증 타입

### 기본 타입 검증

| 데코레이터 | 한국어 메시지 | 영어 메시지 |
|-----------|-------------|-----------|
| `@IsString()` | {property}은(는) 문자열이어야 합니다. | {property} must be a string. |
| `@IsNumber()` | {property}은(는) 숫자여야 합니다. | {property} must be a number. |
| `@IsInt()` | {property}은(는) 정수여야 합니다. | {property} must be an integer. |
| `@IsBoolean()` | {property}은(는) 불리언(true/false)이어야 합니다. | {property} must be a boolean value. |
| `@IsDate()` | {property}은(는) 유효한 날짜여야 합니다. | {property} must be a valid date. |
| `@IsArray()` | {property}은(는) 배열이어야 합니다. | {property} must be an array. |

### 문자열 검증

| 데코레이터 | 한국어 메시지 | 영어 메시지 |
|-----------|-------------|-----------|
| `@IsEmail()` | {property}은(는) 유효한 이메일 주소여야 합니다. | {property} must be a valid email address. |
| `@IsNotEmpty()` | {property}은(는) 비어있을 수 없습니다. | {property} should not be empty. |
| `@MinLength(n)` | {property}은(는) 최소 {constraints} 자 이상이어야 합니다. | {property} must be at least {constraints} characters long. |
| `@MaxLength(n)` | {property}은(는) 최대 {constraints} 자 이하여야 합니다. | {property} must be at most {constraints} characters long. |
| `@IsUrl()` | {property}은(는) 유효한 URL이어야 합니다. | {property} must be a valid URL. |
| `@IsUUID()` | {property}은(는) 유효한 UUID여야 합니다. | {property} must be a valid UUID. |

### 숫자 검증

| 데코레이터 | 한국어 메시지 | 영어 메시지 |
|-----------|-------------|-----------|
| `@Min(n)` | {property}은(는) {constraints} 이상이어야 합니다. | {property} must be at least {constraints}. |
| `@Max(n)` | {property}은(는) {constraints} 이하여야 합니다. | {property} must be at most {constraints}. |
| `@IsPositive()` | {property}은(는) 양수여야 합니다. | {property} must be a positive number. |
| `@IsNegative()` | {property}은(는) 음수여야 합니다. | {property} must be a negative number. |

### 고급 검증

| 데코레이터 | 한국어 메시지 | 영어 메시지 |
|-----------|-------------|-----------|
| `@IsEnum(enum)` | {property}은(는) 다음 값 중 하나여야 합니다: {constraints} | {property} must be one of the following values: {constraints} |
| `@Matches(pattern)` | {property}은(는) {constraints} 패턴과 일치해야 합니다. | {property} must match {constraints} pattern. |
| `@IsStrongPassword()` | {property}은(는) 강력한 비밀번호여야 합니다 (최소 8자, 대문자, 소문자, 숫자, 특수문자 포함). | {property} must be a strong password (at least 8 characters, including uppercase, lowercase, number, and special character). |

---

## 커스터마이징

### 1. 새로운 언어 추가

```bash
# 1. 번역 파일 생성
mkdir -p src/i18n/ja
touch src/i18n/ja/validation.json
```

```json
{
  "validation": {
    "isEmail": "{property}は有効なメールアドレスである必要があります。",
    "isNotEmpty": "{property}は空にすることはできません。"
  }
}
```

```typescript
// 2. AppModule에 언어 추가 (필요시)
I18nModule.forRoot({
  fallbackLanguage: 'ko',
  loaderOptions: {
    path: path.join(__dirname, '/i18n/'),
    watch: true,
  },
})
```

### 2. 커스텀 검증 메시지 추가

```json
// src/i18n/ko/validation.json
{
  "validation": {
    // ... 기존 메시지
    "isCustom": "{property}은(는) 사용자 정의 검증을 통과해야 합니다."
  }
}
```

### 3. 속성명 번역 (선택사항)

```json
// src/i18n/ko/validation.json
{
  "validation": {
    "properties": {
      "email": "이메일",
      "name": "이름",
      "password": "비밀번호"
    }
  }
}
```

이렇게 하면 오류 메시지에서 속성명도 번역됩니다:
- `email은(는) 유효한 이메일 주소여야 합니다.` → `이메일은(는) 유효한 이메일 주소여야 합니다.`

---

## 예제

### 예제 1: 사용자 등록 DTO

```typescript
// src/modules/users/dto/create-user.dto.ts
import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
```

### 예제 2: 제품 생성 DTO

```typescript
// src/modules/products/dto/create-product.dto.ts
import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;
}
```

### 예제 3: 테스트 코드

```typescript
// src/common/pipes/i18n-validation.pipe.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { I18nValidationPipe } from './i18n-validation.pipe';
import { BadRequestException } from '@nestjs/common';

describe('I18nValidationPipe', () => {
  let pipe: I18nValidationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [I18nValidationPipe],
    }).compile();

    pipe = module.get<I18nValidationPipe>(I18nValidationPipe);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should transform valid data', async () => {
    class TestDto {
      @IsString()
      name: string;
    }

    const validData = { name: 'John' };
    const result = await pipe.transform(validData, { metatype: TestDto });

    expect(result).toEqual(validData);
  });

  it('should throw BadRequestException for invalid data', async () => {
    class TestDto {
      @IsString()
      @IsNotEmpty()
      name: string;
    }

    const invalidData = { name: '' };

    await expect(
      pipe.transform(invalidData, { metatype: TestDto }),
    ).rejects.toThrow(BadRequestException);
  });
});
```

---

## 참고 자료

### 관련 문서
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)
- [class-validator](https://github.com/typestack/class-validator)
- [nestjs-i18n](https://nestjs-i18n.com/)
- [JSON:API Error Objects](https://jsonapi.org/format/#errors)

### 프로젝트 파일
- [I18nValidationPipe](../src/common/pipes/i18n-validation.pipe.ts)
- [한국어 번역](../src/i18n/ko/validation.json)
- [영어 번역](../src/i18n/en/validation.json)
- [예제 DTO](../src/common/dto/create-user-example.dto.ts)

---

**마지막 업데이트**: 2025-11-09
**버전**: 1.0.0
**작성자**: Claude Code
