# JSON:API 1.1 구현 가이드

이 프로젝트는 [JSON:API 1.1 스펙](https://jsonapi.org/format/1.1/)을 완전히 준수합니다.

## 📋 목차

- [JSON:API란?](#jsonapi란)
- [응답 형식](#응답-형식)
- [요청 형식](#요청-형식)
- [쿼리 파라미터](#쿼리-파라미터)
- [에러 처리](#에러-처리)
- [사용 예시](#사용-예시)

---

## JSON:API란?

JSON:API는 클라이언트와 서버 간의 데이터 교환을 위한 표준화된 스펙입니다. 일관된 방식으로 데이터를 구조화하여 API의 일관성과 예측 가능성을 높입니다.

### 주요 장점

- ✅ **일관성**: 모든 API 엔드포인트가 동일한 구조를 사용
- ✅ **효율성**: Sparse Fieldsets로 필요한 데이터만 요청
- ✅ **관계 표현**: Relationships와 Compound Documents로 관련 데이터 표현
- ✅ **표준화**: 국제 표준 스펙 준수
- ✅ **확장성**: Filtering, Sorting, Pagination 내장 지원

---

## 응답 형식

### 기본 응답 구조

모든 JSON:API 응답은 다음 구조를 따릅니다:

```json
{
  "jsonapi": {
    "version": "1.1"
  },
  "data": {
    "type": "users",
    "id": "1",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com",
      "isActive": true
    }
  },
  "meta": {
    "timestamp": "2025-11-07T12:00:00.000Z",
    "apiVersion": "1.1"
  }
}
```

### Resource Object

각 리소스는 다음 필드를 포함합니다:

- **type** (필수): 리소스 타입 (예: "users", "posts")
- **id** (필수): 리소스 고유 ID
- **attributes**: 리소스 속성
- **relationships**: 관련 리소스 (선택)
- **links**: 리소스 링크 (선택)
- **meta**: 리소스 메타 정보 (선택)

### 복수 리소스 응답

```json
{
  "jsonapi": { "version": "1.1" },
  "data": [
    {
      "type": "users",
      "id": "1",
      "attributes": { "name": "John Doe" }
    },
    {
      "type": "users",
      "id": "2",
      "attributes": { "name": "Jane Smith" }
    }
  ],
  "meta": {
    "timestamp": "2025-11-07T12:00:00.000Z"
  }
}
```

### 페이지네이션 응답

```json
{
  "jsonapi": { "version": "1.1" },
  "data": [...],
  "meta": {
    "currentPage": 1,
    "pageSize": 10,
    "totalItems": 50,
    "totalPages": 5,
    "timestamp": "2025-11-07T12:00:00.000Z"
  },
  "links": {
    "self": "/api/users?page[number]=1&page[size]=10",
    "first": "/api/users?page[number]=1&page[size]=10",
    "last": "/api/users?page[number]=5&page[size]=10",
    "prev": null,
    "next": "/api/users?page[number]=2&page[size]=10"
  }
}
```

---

## 요청 형식

### CREATE (POST)

새 리소스 생성 시:

```http
POST /api/users
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "users",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com",
      "password": "securepassword"
    }
  }
}
```

**응답 (201 Created)**:

```json
{
  "jsonapi": { "version": "1.1" },
  "data": {
    "type": "users",
    "id": "1",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com",
      "isActive": true
    }
  }
}
```

### UPDATE (PATCH)

리소스 수정 시:

```http
PATCH /api/users/1
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "users",
    "id": "1",
    "attributes": {
      "name": "John Updated"
    }
  }
}
```

**응답 (200 OK)**:

```json
{
  "jsonapi": { "version": "1.1" },
  "data": {
    "type": "users",
    "id": "1",
    "attributes": {
      "name": "John Updated",
      "email": "john@example.com",
      "isActive": true
    }
  }
}
```

### DELETE

리소스 삭제 시:

```http
DELETE /api/users/1
```

**응답 (204 No Content)**:

```
(빈 응답)
```

---

## 쿼리 파라미터

### 1. Sparse Fieldsets

**필요한 필드만 요청하여 응답 크기 최소화**

```http
GET /api/users?fields[users]=name,email
```

**응답**:

```json
{
  "data": {
    "type": "users",
    "id": "1",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### 2. Filtering

**조건에 맞는 리소스만 필터링**

```http
GET /api/users?filter[isActive]=true&filter[name]=John
```

**지원하는 필터 연산자**:

- `filter[field]=value` - 정확한 일치
- `filter[field][contains]=value` - 부분 일치 (문자열)
- `filter[field][gte]=value` - 크거나 같음 (숫자, 날짜)
- `filter[field][lte]=value` - 작거나 같음 (숫자, 날짜)

### 3. Sorting

**정렬 기준 지정 (- prefix로 내림차순)**

```http
GET /api/users?sort=-createdAt,name
```

- `sort=name` - name 오름차순
- `sort=-name` - name 내림차순
- `sort=-createdAt,name` - createdAt 내림차순 → name 오름차순

### 4. Pagination

**페이지 단위로 데이터 요청**

```http
GET /api/users?page[number]=2&page[size]=10
```

- `page[number]` - 페이지 번호 (기본값: 1)
- `page[size]` - 페이지 크기 (기본값: 10, 최대: 100)

**응답**:

```json
{
  "data": [...],
  "meta": {
    "currentPage": 2,
    "pageSize": 10,
    "totalItems": 50,
    "totalPages": 5
  },
  "links": {
    "self": "/api/users?page[number]=2&page[size]=10",
    "first": "/api/users?page[number]=1&page[size]=10",
    "last": "/api/users?page[number]=5&page[size]=10",
    "prev": "/api/users?page[number]=1&page[size]=10",
    "next": "/api/users?page[number]=3&page[size]=10"
  }
}
```

### 5. 쿼리 파라미터 조합

모든 쿼리 파라미터를 동시에 사용 가능:

```http
GET /api/users?fields[users]=name,email&filter[isActive]=true&sort=-createdAt&page[number]=1&page[size]=20
```

---

## 에러 처리

### 에러 응답 형식

모든 에러는 JSON:API 표준 형식을 따릅니다:

```json
{
  "jsonapi": { "version": "1.1" },
  "errors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "422",
      "code": "VALIDATION_ERROR",
      "title": "Unprocessable Entity",
      "detail": "email must be a valid email",
      "source": {
        "pointer": "/data/attributes/email"
      },
      "meta": {
        "timestamp": "2025-11-07T12:00:00.000Z"
      }
    }
  ],
  "meta": {
    "timestamp": "2025-11-07T12:00:00.000Z"
  }
}
```

### 에러 필드 설명

- **id**: 에러 고유 ID (UUID)
- **status**: HTTP 상태 코드
- **code**: 애플리케이션별 에러 코드
- **title**: 에러 제목 (간단한 설명)
- **detail**: 에러 상세 설명
- **source**: 에러 발생 위치
  - `pointer`: JSON Pointer 형식 (예: "/data/attributes/email")
  - `parameter`: 쿼리 파라미터 이름
- **meta**: 에러 메타 정보

### 주요 에러 코드

| HTTP Status | Code                   | 설명                  |
| ----------- | ---------------------- | --------------------- |
| 400         | BAD_REQUEST            | 잘못된 요청           |
| 401         | UNAUTHORIZED           | 인증 필요             |
| 403         | FORBIDDEN              | 권한 없음             |
| 404         | NOT_FOUND              | 리소스를 찾을 수 없음 |
| 409         | CONFLICT               | 충돌 (중복 등)        |
| 422         | VALIDATION_ERROR       | 유효성 검증 실패      |
| 500         | INTERNAL_SERVER_ERROR  | 서버 내부 오류        |

### 다중 에러 응답

여러 유효성 검증 오류가 발생한 경우:

```json
{
  "errors": [
    {
      "id": "uuid-1",
      "status": "422",
      "code": "VALIDATION_ERROR",
      "detail": "email must be a valid email",
      "source": { "pointer": "/data/attributes/email" }
    },
    {
      "id": "uuid-2",
      "status": "422",
      "code": "VALIDATION_ERROR",
      "detail": "password must be longer than 8 characters",
      "source": { "pointer": "/data/attributes/password" }
    }
  ]
}
```

---

## 사용 예시

### cURL 예시

#### 1. 사용자 목록 조회 (페이지네이션)

```bash
curl -X GET "http://localhost:3000/api/users?page[number]=1&page[size]=10" \
  -H "Content-Type: application/vnd.api+json"
```

#### 2. 사용자 생성

```bash
curl -X POST "http://localhost:3000/api/users" \
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

#### 3. 사용자 조회 (Sparse Fieldsets)

```bash
curl -X GET "http://localhost:3000/api/users/1?fields[users]=name,email" \
  -H "Content-Type: application/vnd.api+json"
```

#### 4. 사용자 수정

```bash
curl -X PATCH "http://localhost:3000/api/users/1" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "users",
      "id": "1",
      "attributes": {
        "name": "John Updated"
      }
    }
  }'
```

#### 5. 사용자 삭제

```bash
curl -X DELETE "http://localhost:3000/api/users/1" \
  -H "Content-Type: application/vnd.api+json"
```

#### 6. 필터링 + 정렬 + 페이지네이션

```bash
curl -X GET "http://localhost:3000/api/users?filter[isActive]=true&sort=-createdAt&page[number]=1&page[size]=20" \
  -H "Content-Type: application/vnd.api+json"
```

### JavaScript/TypeScript 예시 (fetch)

```typescript
// 사용자 목록 조회
const response = await fetch('/api/users?page[number]=1&page[size]=10', {
  headers: {
    'Content-Type': 'application/vnd.api+json',
  },
});

const json = await response.json();
console.log(json.data); // 사용자 배열
console.log(json.meta); // 페이지네이션 메타 정보
console.log(json.links); // 페이지네이션 링크

// 사용자 생성
const createResponse = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/vnd.api+json',
  },
  body: JSON.stringify({
    data: {
      type: 'users',
      attributes: {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securepass123',
      },
    },
  }),
});

const createdUser = await createResponse.json();
console.log(createdUser.data); // 생성된 사용자
```

---

## 베스트 프랙티스

### 1. Content-Type 헤더

JSON:API 요청 시 항상 적절한 Content-Type 헤더 사용:

```
Content-Type: application/vnd.api+json
```

### 2. 에러 처리

클라이언트에서 항상 `errors` 배열 확인:

```typescript
if (response.errors) {
  response.errors.forEach((error) => {
    console.error(`${error.title}: ${error.detail}`);
  });
}
```

### 3. 페이지네이션 링크 사용

`links` 객체의 `next`, `prev` 등을 활용하여 페이지 이동:

```typescript
const nextPageUrl = response.links.next;
if (nextPageUrl) {
  // 다음 페이지 로드
}
```

### 4. Sparse Fieldsets 활용

네트워크 트래픽 최소화를 위해 필요한 필드만 요청:

```
?fields[users]=id,name,email
```

---

## 추가 자료

- [JSON:API 공식 문서](https://jsonapi.org/)
- [JSON:API 1.1 스펙](https://jsonapi.org/format/1.1/)
- [JSON:API 예시](https://jsonapi.org/examples/)
- [Swagger 문서](http://localhost:3000/api/docs)

---

**이 프로젝트는 JSON:API 1.1 스펙을 100% 준수하며, 지속적으로 업데이트됩니다.**
