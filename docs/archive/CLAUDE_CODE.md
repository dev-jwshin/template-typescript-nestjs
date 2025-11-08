# 🤖 Claude Code 최적화 가이드

이 문서는 Claude Code(바이브 코딩)를 활용하여 이 프로젝트를 효율적으로 개발하는 방법을 설명합니다.

## 🎯 바이브 코딩 최적화 특징

### 1. 명확한 구조와 네이밍

프로젝트는 Claude Code가 쉽게 이해할 수 있도록 설계되었습니다:

```
✅ 명확한 파일명
- users.controller.ts  (역할이 즉시 파악됨)
- create-user.dto.ts   (목적이 명확함)
- user.entity.ts       (데이터 모델임을 알 수 있음)

✅ 계층별 디렉토리 분리
- dto/         → 데이터 전송 객체
- entities/    → 데이터 모델
- interfaces/  → 타입 정의
```

### 2. 풍부한 타입 정보

모든 코드에 명시적 타입이 선언되어 있어 Claude Code가 컨텍스트를 정확히 파악합니다:

```typescript
// ✅ 명시적 타입 선언
async create(createUserDto: CreateUserDto): Promise<User> {
  // ...
}

// ❌ 타입 정보 부족
async create(data) {
  // ...
}
```

### 3. JSDoc 주석

모든 public 메서드와 클래스에 JSDoc 주석이 작성되어 있어 Claude Code가 의도를 이해합니다:

```typescript
/**
 * 새 사용자 생성
 * @param createUserDto 사용자 생성 데이터
 * @returns 생성된 사용자 정보
 * @throws NotFoundException 사용자를 찾을 수 없는 경우
 */
async create(createUserDto: CreateUserDto): Promise<User> {
  // ...
}
```

### 4. Swagger 데코레이터

API 스펙이 코드에 내장되어 있어 Claude Code가 API 요구사항을 파악합니다:

```typescript
@ApiOperation({ summary: '새 사용자 생성' })
@ApiResponse({ status: 201, description: '사용자가 성공적으로 생성됨', type: User })
@ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
@Post()
create(@Body() createUserDto: CreateUserDto) {
  // ...
}
```

## 💡 Claude Code 활용 시나리오

### 시나리오 1: 새 기능 모듈 추가 (JSON:API 준수)

**프롬프트 예시**:
```
"posts 모듈을 생성해주세요.
- 제목, 내용, 작성자, 작성일 필드를 가진 Post 엔티티
- JSON:API 1.1 스펙을 준수하는 CRUD API 엔드포인트
- Filtering, Sorting, Pagination 지원
- Users 모듈과 동일한 JSON:API 구조로 생성"
```

**Claude Code의 작업 흐름**:
1. Users 모듈 구조 분석 (JSON:API 패턴 포함)
2. 동일한 패턴으로 Posts 모듈 생성
3. DTO, Entity, Controller, Service, Module 파일 생성
4. @JsonApiResource 데코레이터 적용
5. Filtering, Sorting, Pagination 지원
6. App Module에 자동 등록

### 시나리오 1-1: JSON:API 쿼리 파라미터 활용

**프롬프트 예시**:
```
"Posts API에 다음 쿼리 기능을 추가해주세요:
- Filtering: status (draft, published), category
- Sorting: -createdAt, title
- Pagination: 기본 페이지 크기 20
- Sparse Fieldsets: title, content, author"
```

**Claude Code의 작업 흐름**:
1. @Filter, @Sort, @Pagination, @SparseFields 데코레이터 추가
2. Service에서 필터링/정렬 로직 구현
3. Swagger 문서에 쿼리 파라미터 추가
4. 응답에 페이지네이션 메타 정보 포함

### 시나리오 2: API 엔드포인트 수정

**프롬프트 예시**:
```
"users.controller.ts의 findAll 메서드에
페이지네이션과 검색 기능을 추가해주세요.
- page, limit 쿼리 파라미터
- name으로 검색
- 응답에 총 개수 포함"
```

**Claude Code의 작업 흐름**:
1. 기존 findAll 메서드 분석
2. DTO 생성 (QueryUserDto)
3. Service 로직 수정
4. Controller 수정 및 Swagger 문서 업데이트

### 시나리오 3: 유효성 검사 규칙 추가

**프롬프트 예시**:
```
"CreateUserDto에 다음 검증 규칙을 추가해주세요:
- email은 회사 도메인(@company.com)만 허용
- password는 대문자, 소문자, 숫자, 특수문자 포함 필수
- name은 2~50자 제한"
```

**Claude Code의 작업 흐름**:
1. CreateUserDto 분석
2. 커스텀 validator 또는 정규식 추가
3. Swagger 문서 자동 업데이트

### 시나리오 4: 에러 처리 개선

**프롬프트 예시**:
```
"users.service.ts의 모든 메서드에
적절한 에러 처리를 추가해주세요.
- 데이터베이스 에러는 InternalServerErrorException
- 찾을 수 없는 리소스는 NotFoundException
- 중복 이메일은 ConflictException"
```

**Claude Code의 작업 흐름**:
1. 기존 Service 메서드 분석
2. try-catch 블록 추가
3. 적절한 HTTP 예외 던지기
4. JSDoc에 @throws 태그 추가

## 🚀 효율적인 프롬프트 작성법

### ✅ 좋은 프롬프트 예시

```
"Users 모듈을 참고하여 Products 모듈을 생성해주세요.

요구사항:
1. Entity 필드:
   - name (string, 필수)
   - description (string, 선택)
   - price (number, 필수, 0 이상)
   - stock (number, 필수, 0 이상)
   - category (string, 필수)

2. API 엔드포인트:
   - GET /api/products (목록 조회, 페이지네이션 지원)
   - GET /api/products/:id (상세 조회)
   - POST /api/products (생성)
   - PATCH /api/products/:id (수정)
   - DELETE /api/products/:id (삭제)

3. 유효성 검사:
   - price와 stock은 음수 불가
   - name은 2~100자 제한
   - category는 enum (Electronics, Clothing, Food)

4. Swagger 문서 포함"
```

### ❌ 피해야 할 프롬프트

```
"상품 기능 만들어줘"
→ 너무 모호함

"products API 좀 해줘"
→ 구체적인 요구사항 부족

"저번에 말한 대로 해줘"
→ 컨텍스트 부족
```

## 🔍 Claude Code가 쉽게 찾을 수 있는 정보

### 1. 프로젝트 구조
```
"src/modules 디렉토리의 모든 모듈을 분석하고
각 모듈의 역할을 설명해주세요"
→ 명확한 디렉토리 구조 덕분에 쉽게 분석 가능
```

### 2. 타입 정보
```
"User 엔티티의 모든 필드와 타입을 알려주세요"
→ TypeScript 타입 선언으로 즉시 파악 가능
```

### 3. API 스펙
```
"Users API의 모든 엔드포인트와 요청/응답 형식을 정리해주세요"
→ Swagger 데코레이터로 자동 추출 가능
```

### 4. 의존성 관계
```
"AppModule에 등록된 모든 모듈과 그들의 의존성을 시각화해주세요"
→ Module의 imports/providers/exports로 명확히 파악
```

## 📋 체크리스트

Claude Code로 코드를 생성할 때 다음을 확인하세요:

### 파일 생성 시
- [ ] 파일명이 규칙을 따르는가? (`kebab-case.type.ts`)
- [ ] 적절한 디렉토리에 위치하는가?
- [ ] JSDoc 주석이 작성되었는가?
- [ ] 모든 타입이 명시적으로 선언되었는가?

### API 엔드포인트 생성 시
- [ ] Swagger 데코레이터가 추가되었는가?
- [ ] DTO에 유효성 검사 규칙이 있는가?
- [ ] 적절한 HTTP 상태 코드를 사용하는가?
- [ ] 에러 처리가 구현되었는가?

### 모듈 생성 시
- [ ] Module에 적절히 등록되었는가?
- [ ] AppModule에 import되었는가?
- [ ] 의존성이 올바르게 주입되는가?
- [ ] 테스트 파일이 함께 생성되었는가?

## 🎓 학습 리소스

### Claude Code에게 질문하기

```
"NestJS의 Dependency Injection은 어떻게 동작하나요?"
"이 프로젝트에서 새로운 Guard를 추가하는 방법을 설명해주세요"
"TypeORM을 이 프로젝트에 통합하는 단계를 알려주세요"
```

### 코드 리뷰 요청

```
"users.service.ts를 리뷰하고 개선점을 제안해주세요"
"이 DTO의 유효성 검사 규칙이 충분한가요?"
"성능 최적화를 위해 이 코드를 어떻게 개선할 수 있나요?"
```

## 🔧 트러블슈팅

### Claude Code가 코드를 잘못 이해할 때

**문제**: Claude가 잘못된 위치에 파일을 생성
**해결**:
```
"src/modules/users/dto/ 디렉토리에
update-user.dto.ts 파일을 생성해주세요"
→ 정확한 경로 지정
```

**문제**: 타입 추론이 잘못됨
**해결**:
```
"User 엔티티는 다음 타입을 가집니다:
- id: string
- name: string
- email: string
..."
→ 명시적 타입 제공
```

---

**이 프로젝트는 Claude Code와의 협업을 최우선으로 고려하여 설계되었습니다.
위 가이드를 참고하여 효율적인 AI 기반 개발을 경험하세요!**
