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

## 📂 프로젝트 구조

```
src/
├── common/              # 공통 유틸리티 및 공유 코드
│   ├── decorators/      # 커스텀 데코레이터
│   ├── filters/         # 예외 필터
│   ├── guards/          # 인증/인가 가드
│   ├── interceptors/    # 요청/응답 인터셉터
│   ├── pipes/           # 유효성 검사 파이프
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
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.module.ts
│
├── database/            # 데이터베이스 관련
│   ├── migrations/
│   └── seeds/
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

### Users (예시)
- `GET /api/users` - 사용자 목록 조회
- `GET /api/users/:id` - 사용자 상세 조회
- `POST /api/users` - 사용자 생성
- `PATCH /api/users/:id` - 사용자 수정
- `DELETE /api/users/:id` - 사용자 삭제

## 💾 데이터베이스 관리

### Prisma 명령어

```bash
# Prisma Studio (데이터베이스 GUI)
pnpm prisma:studio

# 스키마 변경 후 마이그레이션 생성
pnpm prisma:migrate

# 프로덕션 마이그레이션 적용
pnpm prisma:migrate:deploy

# 데이터베이스 초기화 (주의: 모든 데이터 삭제)
pnpm db:reset

# 스키마를 데이터베이스에 직접 푸시 (개발 전용)
pnpm db:push
```

### 마이그레이션 워크플로우

1. `prisma/schema.prisma` 파일에서 모델 수정
2. `pnpm prisma:migrate` 실행하여 마이그레이션 생성
3. 마이그레이션 파일 확인 (`prisma/migrations/`)
4. 커밋 후 배포 시 `pnpm prisma:migrate:deploy` 실행

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

## 🔗 참고 자료

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)
- [Claude Code 가이드](https://docs.claude.com/claude-code)

---

**Made with ❤️ for Claude Code & Developers**
