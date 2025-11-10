# 에러 처리 시스템 가이드

> 중앙화된 에러 메시지 관리 및 다국어 지원

## 📋 목차

- [개요](#개요)
- [아키텍처](#아키텍처)
- [사용 방법](#사용-방법)
- [커스텀 예외](#커스텀-예외)
- [에러 번역](#에러-번역)
- [베스트 프랙티스](#베스트-프랙티스)
- [예제](#예제)

---

## 개요

### 주요 기능

- ✅ **중앙화된 에러 메시지**: 모든 에러 메시지를 I18n 파일에서 관리
- ✅ **다국어 지원**: 한국어(ko), 영어(en) 자동 전환
- ✅ **JSON:API 1.1 준수**: 표준화된 에러 응답 형식
- ✅ **타입 안전**: TypeScript 기반 에러 클래스
- ✅ **확장 가능**: 새로운 언어 및 에러 타입 쉽게 추가

### 시스템 구성

```
src/
├── i18n/                                    # 번역 파일
│   ├── ko/
│   │   ├── error.json                       # 한국어 에러 메시지
│   │   └── validation.json                  # 한국어 검증 메시지
│   └── en/
│       ├── error.json                       # 영어 에러 메시지
│       └── validation.json                  # 영어 검증 메시지
├── common/
│   ├── filters/
│   │   └── jsonapi-exception.filter.ts      # JSON:API 에러 필터 (I18n 지원)
│   ├── exceptions/
│   │   ├── i18n-http.exception.ts           # I18n HTTP 예외 클래스
│   │   ├── business.exception.ts            # 비즈니스 예외 클래스
│   │   └── index.ts
│   └── utils/
│       └── error.helper.ts                  # 에러 헬퍼 유틸리티
```

---

## 아키텍처

### 에러 처리 흐름

```
1. Service Layer
   ├─ throw new UserNotFoundException()
   ↓
2. JsonApiExceptionFilter
   ├─ I18nContext.current() (언어 감지)
   ├─ i18n.t('error.business.userNotFound')
   ↓
3. JSON:API 에러 응답
   ├─ { errors: [{ status, code, title, detail }] }
   ↓
4. 클라이언트
```

### 에러 계층 구조

```
Error (JavaScript)
  ↓
HttpException (NestJS)
  ↓
I18nHttpException (I18n 베이스)
  ├─ I18nBadRequestException (400)
  ├─ I18nUnauthorizedException (401)
  ├─ I18nForbiddenException (403)
  ├─ I18nNotFoundException (404)
  ├─ I18nConflictException (409)
  └─ ...
  ↓
Business Exception (비즈니스 로직)
  ├─ UserNotFoundException
  ├─ EmailAlreadyExistsException
  ├─ InvalidCredentialsException
  └─ ...
```

---

## 사용 방법

### 1. 기본 HTTP 에러

#### 사용 예시

```typescript
import {
  I18nNotFoundException,
  I18nConflictException,
  I18nBadRequestException,
} from '../common/exceptions';

@Injectable()
export class UsersService {
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      // ✅ I18n 키 기반 에러 (자동 번역)
      throw new I18nNotFoundException('error.business.userNotFound', { userId: id });
    }

    return user;
  }
}
```

#### 응답 예시 (한국어)

```json
{
  "jsonapi": { "version": "1.1" },
  "errors": [
    {
      "id": "uuid-here",
      "status": "404",
      "code": "NOT_FOUND",
      "title": "리소스를 찾을 수 없습니다.",
      "detail": "사용자를 찾을 수 없습니다.",
      "meta": {
        "timestamp": "2025-11-10T..."
      }
    }
  ]
}
```

#### 응답 예시 (영어, `?lang=en`)

```json
{
  "jsonapi": { "version": "1.1" },
  "errors": [
    {
      "id": "uuid-here",
      "status": "404",
      "code": "NOT_FOUND",
      "title": "Resource not found.",
      "detail": "User not found.",
      "meta": {
        "timestamp": "2025-11-10T..."
      }
    }
  ]
}
```

### 2. 비즈니스 로직 에러

#### 사용 예시

```typescript
import {
  UserNotFoundException,
  EmailAlreadyExistsException,
  InvalidCredentialsException,
} from '../common/exceptions';

@Injectable()
export class AuthService {
  async register(createUserDto: CreateUserDto) {
    // 이메일 중복 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      // ✅ 비즈니스 예외 (I18n 자동 적용)
      throw new EmailAlreadyExistsException(createUserDto.email);
    }

    return this.usersService.create(createUserDto);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UserNotFoundException();
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new InvalidCredentialsException();
    }

    return this.generateToken(user);
  }
}
```

### 3. 언어 설정

#### 방법 1: 쿼리 파라미터 (우선순위 1)

```bash
GET /api/users/123?lang=en
GET /api/users/123?lang=ko
```

#### 방법 2: Accept-Language 헤더 (우선순위 2)

```bash
curl -H "Accept-Language: en" http://localhost:3000/api/users/123
curl -H "Accept-Language: ko" http://localhost:3000/api/users/123
```

#### 방법 3: 커스텀 헤더 (우선순위 3)

```bash
curl -H "X-Custom-Lang: en" http://localhost:3000/api/users/123
```

---

## 커스텀 예외

### 새로운 예외 클래스 생성

```typescript
// src/common/exceptions/custom.exception.ts
import { I18nConflictException } from './i18n-http.exception';

export class ProductOutOfStockException extends I18nConflictException {
  constructor(productId: string, availableStock: number) {
    super('error.business.productOutOfStock', {
      productId,
      availableStock,
    });
  }
}
```

### 번역 파일에 메시지 추가

```json
// src/i18n/ko/error.json
{
  "business": {
    "productOutOfStock": "상품 ID {productId}의 재고가 부족합니다. (현재 재고: {availableStock})"
  }
}
```

```json
// src/i18n/en/error.json
{
  "business": {
    "productOutOfStock": "Product {productId} is out of stock. (Available: {availableStock})"
  }
}
```

### 사용

```typescript
@Injectable()
export class OrdersService {
  async createOrder(productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (product.stock < quantity) {
      throw new ProductOutOfStockException(productId, product.stock);
    }

    // ...
  }
}
```

---

## 에러 번역

### 번역 파일 구조

#### HTTP 에러 (src/i18n/ko/error.json)

```json
{
  "http": {
    "badRequest": "잘못된 요청입니다.",
    "unauthorized": "인증이 필요합니다.",
    "forbidden": "접근 권한이 없습니다.",
    "notFound": "리소스를 찾을 수 없습니다.",
    "conflict": "리소스가 이미 존재합니다.",
    "internalServerError": "서버 내부 오류가 발생했습니다."
  }
}
```

#### 비즈니스 에러 (src/i18n/ko/error.json)

```json
{
  "business": {
    "userNotFound": "사용자를 찾을 수 없습니다.",
    "emailAlreadyExists": "이메일이 이미 사용 중입니다.",
    "invalidCredentials": "잘못된 인증 정보입니다.",
    "accountLocked": "계정이 잠겨 있습니다.",
    "tokenExpired": "토큰이 만료되었습니다."
  }
}
```

#### Validation 에러 (src/i18n/ko/error.json)

```json
{
  "validation": {
    "required": "{field}은(는) 필수 항목입니다.",
    "invalid": "{field}이(가) 유효하지 않습니다.",
    "tooShort": "{field}이(가) 너무 짧습니다.",
    "tooLong": "{field}이(가) 너무 깁니다."
  }
}
```

### 파라미터 치환

```typescript
// 번역 파일
{
  "resourceNotFound": "{resource}을(를) 찾을 수 없습니다."
}

// 사용
throw new ResourceNotFoundException('Product', productId);

// 결과 (한국어)
"Product을(를) 찾을 수 없습니다."
```

---

## 베스트 프랙티스

### 1. 에러 클래스 사용

**✅ 좋은 예시**:

```typescript
throw new UserNotFoundException(userId);
throw new EmailAlreadyExistsException(email);
```

**❌ 나쁜 예시**:

```typescript
throw new Error('User not found'); // 하드코딩, 다국어 미지원
throw new NotFoundException('사용자를 찾을 수 없습니다.'); // 한국어만 지원
```

### 2. I18n 키 명명 규칙

**규칙**:

- HTTP 에러: `error.http.{statusName}`
- 비즈니스 에러: `error.business.{domainError}`
- Validation 에러: `error.validation.{constraintType}`

**예시**:

```typescript
'error.http.badRequest';
'error.business.userNotFound';
'error.validation.required';
```

### 3. 에러 로깅

```typescript
import { logError } from '../common/utils/error.helper';

try {
  // ...
} catch (error) {
  logError(error, 'UsersService.findOne');
  throw error;
}
```

### 4. 에러 헬퍼 활용

```typescript
import { createI18nException, translateError } from '../common/utils/error.helper';

// 에러 생성
const error = createI18nException('error.business.userNotFound', { userId }, HttpStatus.NOT_FOUND);

// 에러 메시지 번역
const message = translateError('error.business.userNotFound', { userId }, 'User not found');
```

---

## 예제

### 예제 1: 사용자 서비스

```typescript
// src/modules/users/users.service.ts
import {
  UserNotFoundException,
  EmailAlreadyExistsException,
} from '../../common/exceptions';

@Injectable()
export class UsersService {
  /**
   * 사용자 조회
   */
  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new UserNotFoundException(id);
    }

    return user;
  }

  /**
   * 사용자 생성
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // 이메일 중복 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new EmailAlreadyExistsException(createUserDto.email);
    }

    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  /**
   * 사용자 삭제
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id); // UserNotFoundException 자동 발생

    await this.prisma.user.delete({ where: { id } });
  }
}
```

### 예제 2: 인증 서비스

```typescript
// src/modules/auth/auth.service.ts
import {
  InvalidCredentialsException,
  AccountLockedException,
  AccountDisabledException,
  TokenExpiredException,
} from '../../common/exceptions';

@Injectable()
export class AuthService {
  /**
   * 로그인
   */
  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.usersService.findByEmail(loginDto.email);

    // 계정 상태 확인
    if (user.isLocked) {
      throw new AccountLockedException();
    }

    if (!user.isActive) {
      throw new AccountDisabledException();
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(loginDto.password, user.password);

    if (!isValidPassword) {
      throw new InvalidCredentialsException();
    }

    return {
      access_token: this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }

  /**
   * 토큰 검증
   */
  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      return this.usersService.findOne(payload.sub);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new TokenExpiredException();
      }
      throw new TokenInvalidException();
    }
  }
}
```

### 예제 3: 파일 업로드 서비스

```typescript
// src/modules/files/files.service.ts
import {
  FileNotFoundException,
  FileTooLargeException,
  InvalidFileTypeException,
} from '../../common/exceptions';

@Injectable()
export class FilesService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

  /**
   * 파일 업로드
   */
  async upload(file: Express.Multer.File): Promise<string> {
    // 파일 크기 확인
    if (file.size > this.MAX_FILE_SIZE) {
      throw new FileTooLargeException(this.MAX_FILE_SIZE);
    }

    // 파일 타입 확인
    if (!this.ALLOWED_TYPES.includes(file.mimetype)) {
      throw new InvalidFileTypeException(this.ALLOWED_TYPES);
    }

    // 파일 저장
    const filename = `${Date.now()}-${file.originalname}`;
    await fs.promises.writeFile(`./uploads/${filename}`, file.buffer);

    return filename;
  }

  /**
   * 파일 조회
   */
  async findOne(filename: string): Promise<Buffer> {
    try {
      return await fs.promises.readFile(`./uploads/${filename}`);
    } catch (error) {
      throw new FileNotFoundException(filename);
    }
  }
}
```

---

## 참고 자료

### 관련 문서

- [I18n 다국어 검증 시스템](./I18N_VALIDATION.md)
- [JSON:API 1.1 스펙](./JSON_API.md)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)

### 프로젝트 파일

- [JsonApiExceptionFilter](../src/common/filters/jsonapi-exception.filter.ts)
- [I18n HTTP 예외](../src/common/exceptions/i18n-http.exception.ts)
- [비즈니스 예외](../src/common/exceptions/business.exception.ts)
- [에러 헬퍼](../src/common/utils/error.helper.ts)
- [한국어 번역](../src/i18n/ko/error.json)
- [영어 번역](../src/i18n/en/error.json)

---

**마지막 업데이트**: 2025-11-10
**버전**: 1.0.0
**작성자**: Claude Code
