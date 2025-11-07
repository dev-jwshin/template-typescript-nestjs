# 아키텍처 가이드

## 🏗️ 전체 아키텍처

이 프로젝트는 **계층화된 아키텍처(Layered Architecture)**와 **모듈 기반 설계**를 결합한 구조입니다.

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│         (Controllers)                   │
├─────────────────────────────────────────┤
│         Application Layer               │
│         (Services)                      │
├─────────────────────────────────────────┤
│         Domain Layer                    │
│         (Entities, Interfaces)          │
├─────────────────────────────────────────┤
│         Infrastructure Layer            │
│         (Repositories, External APIs)   │
└─────────────────────────────────────────┘
```

## 📦 모듈 구조

### 1. Common Module (공통 모듈)
**목적**: 전체 애플리케이션에서 재사용 가능한 코드

**구성요소**:
- **Decorators**: 커스텀 데코레이터 (예: `@CurrentUser()`, `@Public()`)
- **Filters**: 예외 처리 필터 (예: `HttpExceptionFilter`)
- **Guards**: 인증/인가 가드 (예: `JwtAuthGuard`)
- **Interceptors**: 요청/응답 변환 (예: `LoggingInterceptor`, `TransformInterceptor`)
- **Pipes**: 데이터 변환 및 검증 (예: `ParseUUIDPipe`)
- **Interfaces**: 공통 타입 정의
- **Utils**: 헬퍼 함수

### 2. Config Module (설정 모듈)
**목적**: 환경별 설정 관리

**구성요소**:
- `app.config.ts`: 애플리케이션 기본 설정
- `database.config.ts`: 데이터베이스 연결 설정
- 기타 외부 서비스 설정

### 3. Feature Modules (기능 모듈)
**목적**: 도메인별 기능 구현

**표준 구조**:
```
modules/[feature-name]/
├── dto/                  # 데이터 전송 객체
│   ├── create-*.dto.ts
│   └── update-*.dto.ts
├── entities/             # 엔티티 정의
│   └── *.entity.ts
├── interfaces/           # 모듈 전용 인터페이스
├── [feature].controller.ts
├── [feature].service.ts
├── [feature].repository.ts (선택)
└── [feature].module.ts
```

## 🔄 데이터 흐름

### 요청 처리 흐름 (JSON:API 통합)

```
Client Request (JSON:API Format)
    ↓
Middleware (CORS, Helmet)
    ↓
Guards (Authentication, Authorization)
    ↓
Interceptors (Before)
    ↓
Pipes (JSON:API Validation, DTO Transformation)
    ↓
Controller (Route Handler)
    ↓
Service (Business Logic - Filtering, Sorting, Pagination)
    ↓
Repository (Data Access) - 선택
    ↓
Database / External API
    ↓
Service (Response Preparation)
    ↓
Interceptors (After - JSON:API Transform)
    ↓
Filters (JSON:API Error Handling)
    ↓
Client Response (JSON:API Format)
```

### JSON:API 레이어 통합

이 프로젝트는 NestJS의 표준 아키텍처에 JSON:API 1.1 스펙을 완전히 통합했습니다:

1. **JsonApiValidationPipe**: 요청 바디의 JSON:API 형식 검증 및 DTO 변환
2. **JsonApiTransformInterceptor**: 응답 데이터를 JSON:API ResourceObject로 변환
3. **JsonApiExceptionFilter**: 모든 예외를 JSON:API 에러 형식으로 변환
4. **Query Decorators**: Sparse Fieldsets, Filtering, Sorting, Pagination 파라미터 추출

**계층별 역할**:

- **Controller**: JSON:API 데코레이터로 리소스 타입 지정, 쿼리 파라미터 수신
- **Service**: 필터링/정렬/페이지네이션 로직 처리, 비즈니스 규칙 적용
- **Interceptor**: 서비스 응답을 JSON:API 형식으로 자동 변환
- **Filter**: 예외를 JSON:API 에러 응답으로 변환

## 🎯 설계 원칙

### 1. 단일 책임 원칙 (SRP)
- 각 클래스는 하나의 책임만 가짐
- Controller: HTTP 요청/응답 처리
- Service: 비즈니스 로직
- Repository: 데이터 접근 (선택)

### 2. 의존성 역전 원칙 (DIP)
- 구체적인 구현이 아닌 인터페이스에 의존
- 의존성 주입(DI)을 통한 느슨한 결합

### 3. 개방-폐쇄 원칙 (OCP)
- 확장에는 열려있고 수정에는 닫혀있음
- 데코레이터 패턴을 통한 기능 확장

### 4. 모듈화
- 기능별로 명확히 분리된 모듈
- 각 모듈은 독립적으로 테스트 가능

## 🔐 보안 계층

### 1. 입력 검증
- **DTO + class-validator**: 모든 입력 데이터 검증
- **ValidationPipe**: 자동 검증 및 변환
- **ParseUUIDPipe**: ID 형식 검증

### 2. 인증/인가
- **Guards**: JWT 토큰 검증, 권한 확인
- **Decorators**: 공개 엔드포인트 표시 (`@Public()`)

### 3. 에러 처리
- **Exception Filters**: 일관된 에러 응답
- **Custom Exceptions**: 도메인 특화 예외

## 📊 확장 포인트

### 1. 데이터베이스 추가
```typescript
// config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  // ... 기타 설정
};
```

### 2. 인증 시스템 추가
```typescript
// modules/auth/
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
├── guards/
│   └── jwt-auth.guard.ts
├── auth.service.ts
└── auth.module.ts
```

### 3. 캐싱 레이어 추가
```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60, // 60초
    }),
    // ...
  ],
})
```

### 4. 로깅 시스템 강화
```typescript
// common/logger/
├── logger.service.ts
├── logger.module.ts
└── winston.config.ts
```

## 🧪 테스트 전략

### 1. 단위 테스트 (Unit Tests)
- Service 레이어의 비즈니스 로직 테스트
- Mock을 사용한 의존성 격리

### 2. 통합 테스트 (Integration Tests)
- Controller + Service + Repository 통합 테스트
- 실제 데이터베이스 또는 테스트 컨테이너 사용

### 3. E2E 테스트
- 전체 애플리케이션 흐름 테스트
- 실제 HTTP 요청/응답 검증

## 🚀 성능 최적화 포인트

### 1. 데이터베이스 쿼리 최적화
- 인덱스 전략
- N+1 문제 해결 (Eager/Lazy Loading)
- 쿼리 캐싱

### 2. 응답 캐싱
- Redis 또는 in-memory 캐싱
- Cache-Control 헤더 활용

### 3. 압축
- Compression 미들웨어 사용
- Gzip 압축

### 4. 비동기 처리
- Bull Queue를 통한 백그라운드 작업
- Event Emitter를 통한 느슨한 결합

## 📝 코딩 규칙

### 1. 네이밍 컨벤션
- **파일명**: `kebab-case.type.ts`
- **클래스명**: `PascalCase`
- **변수/함수명**: `camelCase`
- **상수**: `UPPER_SNAKE_CASE`

### 2. 주석 규칙
- 모든 public 메서드에 JSDoc 주석
- 복잡한 로직에는 인라인 주석
- TODO, FIXME 태그 활용

### 3. 타입 안정성
- `any` 타입 사용 최소화
- 명시적 타입 선언 선호
- interface 또는 type alias 적극 활용

## 🔄 마이그레이션 가이드

### 데이터베이스 마이그레이션
```bash
# TypeORM 사용 시
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert
```

### API 버전 관리
- URI 버저닝: `/api/v1/users`, `/api/v2/users`
- 헤더 버저닝: `Accept: application/vnd.api.v1+json`

---

**이 아키텍처는 바이브 코딩(Claude Code) 최적화와 실제 개발 효율성을 모두 고려하여 설계되었습니다.**
