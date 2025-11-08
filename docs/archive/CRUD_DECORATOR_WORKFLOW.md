# NestJS CRUD 데코레이터 시스템 구현 워크플로우

> **생성일**: 2025-11-08
> **기반 설계**: `/Users/jwshin/Desktop/Dev/workspace/templates/nestjs.controller.ts` (2165줄)
> **전략**: Systematic (체계적 구현)
> **목표**: 개발자 편의성 극대화 + Claude Code 바이브 코딩 최적화

---

## 📋 목차

1. [현재 상황 분석](#현재-상황-분석)
2. [원본 설계 핵심 기능](#원본-설계-핵심-기능)
3. [개발자 편의성 평가](#개발자-편의성-평가)
4. [Claude Code 바이브 코딩 적합성 분석](#claude-code-바이브-코딩-적합성-분석)
5. [구현 우선순위](#구현-우선순위)
6. [단계별 구현 로드맵](#단계별-구현-로드맵)
7. [기술 스택 및 의존성](#기술-스택-및-의존성)
8. [위험 요소 및 완화 전략](#위험-요소-및-완화-전략)

---

## 🔍 현재 상황 분석

### ✅ 구현 완료 (Service 기반)
- **PrismaQueryBuilder**: 13가지 필터 연산자, N+1 최적화
- **CrudBaseService**: 베이스 서비스 클래스
- **UsersService**: CrudBaseService 상속 (80% 코드 감소)
- **단위 테스트**: 27/27 통과 (100%)

### ❌ 미구현 (Decorator 기반)
- **@Crud 데코레이터**: 자동 라우트 생성 미구현
- **훅 데코레이터**: @BeforeCreate, @AfterCreate 등 미구현
- **파라미터 데코레이터**: @ParsedBody, @CreatedEntity 등 미구현
- **플러그인 시스템**: AuditLogPlugin, CachingPlugin 등 미구현
- **Controller 자동화**: 여전히 수동 엔드포인트 작성 필요 (260줄)

### 📊 코드 격차 분석

| 항목 | 원본 설계 (데코레이터) | 현재 구현 (Service) | 격차 |
|------|----------------------|---------------------|------|
| Controller 코드 | 50줄 (훅만) | 260줄 (전체 수동) | **210줄 (80% 보일러플레이트)** |
| 라우트 생성 | 자동 | 수동 (@Get, @Post 등) | **완전 수동** |
| 훅 시스템 | @BeforeCreate 등 | 메서드 오버라이드 | **데코레이터 없음** |
| 플러그인 | AuditLog, Caching | 없음 | **플러그인 0개** |
| 타입 안전성 | 100% | 70% | **타입 추론 부족** |

---

## 🎯 원본 설계 핵심 기능

### 1. @Crud 데코레이터 - 자동 라우트 생성 ⭐⭐⭐

**목표**: Controller에서 80% 보일러플레이트 제거

#### Before (현재 - 수동 260줄)
```typescript
@Controller('users')
export class UsersController {
  @Get()
  @JsonApiResource('users')
  findAll(@Filter() filter, @Sort() sort, @Pagination() page) {
    return this.service.findAll({ filter, sort, page });
  }

  @Get(':id')
  @JsonApiResource('users')
  findOne(@Param('id') id) {
    return this.service.findOne(id);
  }

  @Post()
  @JsonApiResource('users')
  create(@Body() dto) {
    return this.service.create(dto);
  }

  // ... 200줄 더
}
```

#### After (목표 - 자동 50줄)
```typescript
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show, CrudOperation.Create],
  allowedIncludes: ['profile', 'roles'],
  allowedFilters: {
    name: ['eq', 'like', 'ilike'],
    age: ['gte', 'lte']
  },
  performance: {
    query: { eagerLoad: true } // N+1 자동 최적화
  }
})
@Controller('users')
export class UsersController {
  // 라우트 자동 생성! 코드 작성 불필요!
}
```

**개발자 이점**:
- ✅ 80% 코드 감소 (260줄 → 50줄)
- ✅ 설정 > 구현 (Declarative)
- ✅ 실수 방지 (라우트 자동 생성)
- ✅ 일관성 (모든 엔드포인트 동일 패턴)

---

### 2. 훅 데코레이터 시스템 ⭐⭐⭐

**목표**: 비즈니스 로직을 선언적으로 표현

#### 핵심 훅 데코레이터
```typescript
// ✅ CRUD 훅
@BeforeCreate()  // 생성 전: 비밀번호 해싱, 중복 체크
@AfterCreate()   // 생성 후: 환영 이메일, 이벤트 발행

@BeforeUpdate()  // 수정 전: 권한 검증, 타임스탬프 갱신
@AfterUpdate()   // 수정 후: 캐시 무효화, 변경 이벤트

@BeforeDelete()  // 삭제 전: 삭제 가능 여부, 연관 데이터 정리
@AfterDelete()   // 삭제 후: 감사 로그, 캐시 정리

// ✅ Model 훅
@BeforeModelInit([CrudOperation.Show, CrudOperation.Update])
// 모델 로드 전: UUID 검증, 존재 여부 캐시 확인

@AfterModelInit([CrudOperation.Index, CrudOperation.Show])
// 모델 로드 후: 민감 필드 제거, 계산 필드 추가

// ✅ 커스텀 훅
@Before('activateUser')  // 커스텀 함수 전 실행
@After('activateUser')   // 커스텀 함수 후 실행
```

#### 사용 예시
```typescript
@Crud({ /* ... */ })
@Controller('users')
export class UsersController {
  // ✅ 생성 전 훅: 비밀번호 해싱
  @BeforeCreate()
  async beforeCreateHook(@ParsedBody() dto: CreateUserDto) {
    dto.password = await hash(dto.password);
    dto.createdAt = new Date();

    // 중복 이메일 체크
    const existing = await this.service.findByEmail(dto.email);
    if (existing) throw new ConflictException('이미 존재하는 이메일');

    return dto;
  }

  // ✅ 생성 후 훅: 환영 이메일
  @AfterCreate()
  async afterCreateHook(@CreatedEntity() user: User) {
    await this.emailService.sendWelcomeEmail(user.email);
    this.eventEmitter.emit('user.created', { userId: user.id });
    return user;
  }
}
```

**개발자 이점**:
- ✅ 로직 분리 (각 훅이 단일 책임)
- ✅ 재사용성 (여러 엔드포인트에서 공통 로직)
- ✅ 테스트 용이성 (훅 단위 테스트)
- ✅ 가독성 (데코레이터 이름으로 실행 시점 명확)

---

### 3. 파라미터 데코레이터 ⭐⭐

**목표**: 훅에서 필요한 데이터를 타입 안전하게 추출

#### 제공 데코레이터
```typescript
// ✅ 요청 데이터
@ParsedBody()     // DTO 객체
@ParsedParams()   // URL 파라미터 ({ id: '123' })
@ParsedQuery()    // 쿼리 파라미터
@ParsedRequest()  // 전체 요청 컨텍스트 (user, ip, headers 등)

// ✅ 엔티티 데이터
@CreatedEntity()  // 생성된 엔티티 (AfterCreate에서 사용)
@UpdatedEntity()  // 수정된 엔티티 (AfterUpdate에서 사용)
@DeletedEntity()  // 삭제된 엔티티 (AfterDelete에서 사용)
@LoadedEntity()   // 로드된 엔티티 (AfterModelInit에서 사용)

// ✅ 컨텍스트 데이터
@CurrentUser()    // 현재 인증된 사용자
@ClientIp()       // 클라이언트 IP 주소
```

#### 사용 예시
```typescript
@BeforeUpdate()
async beforeUpdateHook(
  @ParsedBody() dto: UpdateUserDto,
  @ParsedParams() params: { id: string },
  @ParsedRequest() req: CrudRequest,
  @CurrentUser() currentUser: User
) {
  // 권한 검증
  if (currentUser.id !== params.id && !currentUser.isAdmin) {
    throw new ForbiddenException('다른 사용자 수정 불가');
  }

  // 비밀번호 해싱
  if (dto.password) {
    dto.password = await hash(dto.password);
  }

  return dto;
}
```

**개발자 이점**:
- ✅ 타입 안전성 (컴파일 타임 체크)
- ✅ 명확성 (파라미터 이름으로 역할 명확)
- ✅ IDE 자동완성
- ✅ 보일러플레이트 제거 (request.body 등 불필요)

---

### 4. 플러그인 시스템 ⭐⭐

**목표**: 재사용 가능한 기능을 플러그인으로 패키징

#### 플러그인 인터페이스
```typescript
interface CrudPlugin {
  name: string;
  version: string;

  init?(config: CrudConfig): void;
  registerHooks?(): {
    before?: Partial<Record<CrudOperation, Function>>;
    after?: Partial<Record<CrudOperation, Function>>;
  };
  registerDecorators?(): MethodDecorator[];
  registerMiddleware?(): any[];
}
```

#### 제공 플러그인 예시

##### 1. AuditLogPlugin (감사 로그)
```typescript
const AuditLogPlugin: CrudPlugin = {
  name: 'audit-log',
  version: '1.0.0',

  registerHooks() {
    return {
      after: {
        [CrudOperation.Create]: async (entity, req) => {
          await logAudit({
            action: 'CREATE',
            resourceType: entity.constructor.name,
            resourceId: entity.id,
            userId: req.user?.id,
            ip: req.ip,
            timestamp: new Date()
          });
        },
        [CrudOperation.Update]: async (entity, req) => { /* ... */ },
        [CrudOperation.Delete]: async (entity, req) => { /* ... */ }
      }
    };
  }
};
```

##### 2. CachingPlugin (캐싱)
```typescript
const CachingPlugin: CrudPlugin = {
  name: 'caching',
  version: '1.0.0',

  registerHooks() {
    return {
      after: {
        [CrudOperation.Show]: async (entity, req) => {
          await cache.set(`user:${entity.id}`, entity, 3600);
        }
      },
      before: {
        [CrudOperation.Update]: async (dto, req) => {
          await cache.del(`user:${req.params.id}`);
        },
        [CrudOperation.Delete]: async (params, req) => {
          await cache.del(`user:${params.id}`);
        }
      }
    };
  }
};
```

##### 3. RateLimitPlugin (속도 제한)
```typescript
const RateLimitPlugin: CrudPlugin = {
  name: 'rate-limit',
  version: '1.0.0',

  registerHooks() {
    return {
      before: {
        [CrudOperation.Create]: async (dto, req) => {
          const key = `rate-limit:${req.ip}:create`;
          const count = await redis.incr(key);
          if (count === 1) await redis.expire(key, 60);
          if (count > 10) throw new TooManyRequestsException();
        }
      }
    };
  }
};
```

#### 플러그인 사용
```typescript
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show, CrudOperation.Create],
  plugins: [
    AuditLogPlugin,
    CachingPlugin,
    RateLimitPlugin
  ]
})
@Controller('users')
export class UsersController {}
```

**개발자 이점**:
- ✅ 재사용성 (다른 리소스에서도 사용)
- ✅ 모듈화 (기능별 분리)
- ✅ 테스트 용이성 (플러그인 단위 테스트)
- ✅ 확장성 (새 플러그인 쉽게 추가)

---

### 5. 성능 최적화 설정 ⭐

#### 5.1 쿼리 최적화
```typescript
@Crud({
  performance: {
    query: {
      eagerLoad: true,           // N+1 쿼리 자동 방지
      indexHints: ['idx_email'], // 인덱스 힌트
      timeout: 5000              // 쿼리 타임아웃 (5초)
    }
  }
})
```

#### 5.2 캐싱 설정
```typescript
@Crud({
  performance: {
    cache: {
      enabled: true,
      ttl: 3600,                  // 1시간
      keyStrategy: 'query-based', // 쿼리 파라미터 기반 키
      invalidateOn: [CrudOperation.Create, CrudOperation.Update, CrudOperation.Delete]
    }
  }
})
```

#### 5.3 스트리밍 설정
```typescript
@Crud({
  performance: {
    streaming: {
      enabled: true,   // 대용량 데이터 스트리밍
      chunkSize: 100   // 100개씩 청크 전송
    }
  }
})
```

---

### 6. 개별 라우트 설정 ⭐⭐

**목표**: 엔드포인트별 세밀한 제어

```typescript
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show, CrudOperation.Create],

  // 전역 설정
  allowedIncludes: ['profile'],
  allowedFilters: { name: ['eq', 'like'] },

  // 개별 라우트 설정 (전역 설정 오버라이드)
  routes: {
    // Index: GET /users
    [CrudOperation.Index]: {
      allowedIncludes: ['profile', 'roles'], // 전역보다 많은 includes
      pagination: {
        defaultLimit: 20,
        limit: 50
      },
      swagger: {
        summary: '사용자 목록 조회',
        description: '페이지네이션, 필터링, 정렬 지원'
      }
    },

    // Show: GET /users/:id
    [CrudOperation.Show]: {
      allowedIncludes: ['profile', 'roles', 'permissions'], // 더 많은 관계
      swagger: {
        summary: '사용자 상세 조회'
      }
    },

    // Create: POST /users
    [CrudOperation.Create]: {
      decorators: [
        UseGuards(AuthGuard),
        UseGuards(RolesGuard('admin'))
      ],
      allowedParams: {
        name: { required: true },
        email: { required: true, validate: [IsEmail()] },
        password: {
          type: 'string',
          required: true,
          validate: [IsNotEmpty()],
          description: '사용자 비밀번호',
          example: 'SecureP@ssw0rd'
        }
      }
    },

    // 커스텀 엔드포인트: POST /users/:id/activate
    'activateUser': {
      method: 'POST',
      path: ':id/activate',
      decorators: [UseGuards(AuthGuard), UseGuards(RolesGuard('admin'))],
      swagger: {
        summary: '사용자 활성화',
        description: '비활성 사용자를 활성화합니다'
      }
    }
  }
})
```

**개발자 이점**:
- ✅ 유연성 (엔드포인트별 다른 설정)
- ✅ 권한 제어 (엔드포인트별 Guard)
- ✅ Swagger 문서 커스터마이징
- ✅ 커스텀 엔드포인트 추가

---

## 🎨 개발자 편의성 평가

### ✅ 매우 높음 (5/5)

#### 1. 선언적 설정 (Declarative Configuration)
- **Before**: 명령형 코드 260줄
- **After**: 선언적 설정 50줄
- **개선**: 80% 코드 감소

#### 2. 타입 안전성 (Type Safety)
```typescript
// ✅ IDE 자동완성
allowedFilters: {
  name: ['eq', 'like', 'ilike'], // FilterOperator 타입 자동 완성
  age: ['gt', 'gte', 'lt', 'lte']
}

// ✅ 컴파일 타임 체크
only: [CrudOperation.Index], // CrudOperation enum 사용
```

#### 3. 일관성 (Consistency)
- 모든 리소스가 동일한 패턴 사용
- JSON:API 1.1 스펙 자동 준수
- 에러 응답 표준화

#### 4. 유지보수성 (Maintainability)
- 설정 변경만으로 동작 수정
- 플러그인으로 기능 추가
- 훅으로 로직 분리

#### 5. 학습 곡선 (Learning Curve)
- **초기**: 설정 구조 이해 (1-2시간)
- **중기**: 훅 시스템 숙달 (2-4시간)
- **장기**: 플러그인 개발 (4-8시간)
- **ROI**: 첫 리소스부터 생산성 향상

---

## 🤖 Claude Code 바이브 코딩 적합성 분석

### ✅ 매우 적합 (5/5)

#### 1. 설정 > 구현 (Configuration Over Code)
- Claude Code는 반복적인 코드 생성보다 **설정 작성**에 최적화
- `@Crud` 설정은 구조화된 JSON 형태 → Claude가 쉽게 생성

**예시 프롬프트**:
```
"User 리소스에 CRUD 엔드포인트를 생성하되,
 - name, email 필터링 가능
 - profile, roles 관계 포함 가능
 - N+1 쿼리 최적화 활성화
 - 생성/수정/삭제 시 감사 로그 기록"
```

**Claude 생성 코드** (10초):
```typescript
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show, CrudOperation.Create, CrudOperation.Update, CrudOperation.Delete],
  allowedIncludes: ['profile', 'roles'],
  allowedFilters: {
    name: ['eq', 'like', 'ilike'],
    email: ['eq', 'like', 'ilike']
  },
  performance: {
    query: { eagerLoad: true }
  },
  plugins: [AuditLogPlugin]
})
@Controller('users')
export class UsersController {}
```

#### 2. 패턴 재사용 (Pattern Reuse)
- 한 번 생성한 `@Crud` 설정을 다른 리소스에 복사/수정
- Claude가 패턴을 학습하여 자동 생성

**예시**:
```
"products 리소스를 users와 동일하게 구성하되,
 category, price 필터 추가"
```

#### 3. 훅 생성 용이성 (Easy Hook Generation)
- 훅은 독립적인 함수 → Claude가 쉽게 생성
- 명확한 실행 시점 → 정확한 로직 생성

**예시 프롬프트**:
```
"사용자 생성 전에 비밀번호를 bcrypt로 해싱하고,
 중복 이메일 체크를 추가해줘"
```

**Claude 생성 코드** (5초):
```typescript
@BeforeCreate()
async beforeCreateHook(@ParsedBody() dto: CreateUserDto) {
  dto.password = await bcrypt.hash(dto.password, 10);

  const existing = await this.service.findByEmail(dto.email);
  if (existing) {
    throw new ConflictException('이미 존재하는 이메일입니다');
  }

  return dto;
}
```

#### 4. 플러그인 생성 (Plugin Generation)
- 플러그인은 독립적인 모듈 → Claude가 쉽게 생성
- 표준 인터페이스 → 일관된 구조

**예시 프롬프트**:
```
"모든 Create/Update/Delete 작업에 대해
 Slack으로 알림을 보내는 플러그인을 만들어줘"
```

**Claude 생성 코드** (15초):
```typescript
const SlackNotificationPlugin: CrudPlugin = {
  name: 'slack-notification',
  version: '1.0.0',

  registerHooks() {
    return {
      after: {
        [CrudOperation.Create]: async (entity, req) => {
          await slack.send(`새 ${entity.constructor.name} 생성: ${entity.id}`);
        },
        [CrudOperation.Update]: async (entity, req) => {
          await slack.send(`${entity.constructor.name} 수정: ${entity.id}`);
        },
        [CrudOperation.Delete]: async (entity, req) => {
          await slack.send(`${entity.constructor.name} 삭제: ${entity.id}`);
        }
      }
    };
  }
};
```

#### 5. 테스트 생성 (Test Generation)
- 설정 기반 시스템 → 예측 가능한 동작
- Claude가 쉽게 테스트 케이스 생성

**예시 프롬프트**:
```
"UsersController의 @Crud 설정에 대한
 E2E 테스트를 작성해줘"
```

**Claude 생성 테스트** (20초):
```typescript
describe('UsersController (e2e)', () => {
  it('GET /users - 목록 조회', () => {
    return request(app)
      .get('/users?filter[name][like]=John&include=profile')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data[0].relationships.profile).toBeDefined();
      });
  });

  it('POST /users - 생성', () => {
    return request(app)
      .post('/users')
      .send({ name: 'John', email: 'john@example.com', password: 'pass' })
      .expect(201)
      .expect((res) => {
        expect(res.body.data.attributes.password).toBeUndefined();
      });
  });
});
```

### 🎯 Claude Code 최적화 포인트

#### 1. 명확한 구조 (Clear Structure)
- ✅ 인터페이스 기반 → Claude가 타입 추론
- ✅ JSDoc 주석 → Claude가 컨텍스트 이해
- ✅ 예시 코드 → Claude가 패턴 학습

#### 2. 독립성 (Independence)
- ✅ 각 훅이 독립적 → Claude가 개별 생성
- ✅ 플러그인이 독립적 → Claude가 모듈 생성
- ✅ 설정이 독립적 → Claude가 부분 수정

#### 3. 예측 가능성 (Predictability)
- ✅ 표준 패턴 → Claude가 일관되게 생성
- ✅ 명확한 규칙 → Claude가 정확하게 생성
- ✅ 타입 안전성 → Claude가 에러 방지

---

## 📈 구현 우선순위

### Priority 1 (핵심 - 반드시 구현) ⭐⭐⭐

#### 1.1 @Crud 데코레이터 자동 라우트 생성
- **난이도**: 🔴 높음 (NestJS 메타데이터 + 동적 라우트)
- **예상 시간**: 16-24시간
- **영향도**: ⭐⭐⭐ 매우 높음 (80% 코드 감소)
- **의존성**: 없음 (독립 구현 가능)

**구현 범위**:
- [ ] CrudOperation enum 정의
- [ ] CrudConfig 인터페이스 정의
- [ ] @Crud 데코레이터 구현
- [ ] 메타데이터 저장 (Reflect)
- [ ] 동적 라우트 생성 (Module 라이프사이클)
- [ ] HTTP 메서드 매핑 (GET, POST, PATCH, DELETE)
- [ ] JSON:API 응답 변환
- [ ] Swagger 문서 자동 생성

#### 1.2 기본 훅 데코레이터 (Before/After)
- **난이도**: 🟡 중간 (메타데이터 + 실행 순서)
- **예상 시간**: 8-12시간
- **영향도**: ⭐⭐⭐ 매우 높음 (비즈니스 로직 분리)
- **의존성**: @Crud 데코레이터 필요

**구현 범위**:
- [ ] @BeforeCreate, @AfterCreate
- [ ] @BeforeUpdate, @AfterUpdate
- [ ] @BeforeDelete, @AfterDelete
- [ ] 훅 메타데이터 저장
- [ ] 훅 실행 순서 관리
- [ ] 에러 처리 및 롤백

#### 1.3 파라미터 데코레이터 (기본)
- **난이도**: 🟢 낮음 (createParamDecorator 활용)
- **예상 시간**: 4-6시간
- **영향도**: ⭐⭐ 높음 (타입 안전성)
- **의존성**: 훅 데코레이터 필요

**구현 범위**:
- [ ] @ParsedBody
- [ ] @ParsedParams
- [ ] @ParsedRequest
- [ ] @CreatedEntity
- [ ] @UpdatedEntity
- [ ] @DeletedEntity

### Priority 2 (중요 - 가능하면 구현) ⭐⭐

#### 2.1 플러그인 시스템
- **난이도**: 🟡 중간 (플러그인 인터페이스 + 등록)
- **예상 시간**: 6-10시간
- **영향도**: ⭐⭐ 높음 (확장성)
- **의존성**: 훅 시스템 필요

**구현 범위**:
- [ ] CrudPlugin 인터페이스 정의
- [ ] 플러그인 등록 시스템
- [ ] AuditLogPlugin 구현
- [ ] CachingPlugin 구현
- [ ] RateLimitPlugin 구현

#### 2.2 Model 훅 (@BeforeModelInit, @AfterModelInit)
- **난이도**: 🟡 중간 (라이프사이클 이벤트)
- **예상 시간**: 4-6시간
- **영향도**: ⭐⭐ 높음 (데이터 전처리)
- **의존성**: 기본 훅 데코레이터 필요

**구현 범위**:
- [ ] @BeforeModelInit
- [ ] @AfterModelInit
- [ ] 작업별 실행 (operations 파라미터)
- [ ] 배열/단일 엔티티 처리

#### 2.3 개별 라우트 설정
- **난이도**: 🟡 중간 (설정 병합 로직)
- **예상 시간**: 6-8시간
- **영향도**: ⭐⭐ 높음 (유연성)
- **의존성**: @Crud 데코레이터 필요

**구현 범위**:
- [ ] RouteConfig 인터페이스
- [ ] 전역 설정 + 개별 설정 병합
- [ ] 라우트별 decorators 적용
- [ ] 라우트별 allowedParams 오버라이드

### Priority 3 (선택 - 시간 있으면 구현) ⭐

#### 3.1 성능 최적화 설정
- **난이도**: 🔴 높음 (캐싱, 스트리밍)
- **예상 시간**: 8-12시간
- **영향도**: ⭐ 중간 (성능 향상)
- **의존성**: 기본 CRUD 완료 필요

**구현 범위**:
- [ ] 쿼리 최적화 (eagerLoad, indexHints, timeout)
- [ ] 캐싱 (keyStrategy, invalidateOn)
- [ ] 스트리밍 (chunkSize)

#### 3.2 커스텀 함수 훅 (@Before, @After)
- **난이도**: 🟡 중간 (동적 함수 매핑)
- **예상 시간**: 4-6시간
- **영향도**: ⭐ 중간 (커스텀 엔드포인트)
- **의존성**: 기본 훅 데코레이터 필요

**구현 범위**:
- [ ] @Before(functionName)
- [ ] @After(functionName)
- [ ] 동적 함수 이름 매핑

#### 3.3 Swagger 고급 설정
- **난이도**: 🟡 중간 (Swagger 메타데이터)
- **예상 시간**: 4-6시간
- **영향도**: ⭐ 중간 (문서화)
- **의존성**: @Crud 데코레이터 필요

**구현 범위**:
- [ ] summary, description 자동 생성
- [ ] tags 자동 적용
- [ ] 예시 응답 자동 생성

---

## 🗺️ 단계별 구현 로드맵

### Phase 1: 기반 구축 (1주차) - 24-32시간

#### Day 1-2: @Crud 데코레이터 골격
- [ ] CrudOperation enum 정의
- [ ] CrudConfig 인터페이스 정의 (모든 타입)
- [ ] @Crud 데코레이터 껍데기 구현
- [ ] 메타데이터 저장 (CrudMetadataStorage)
- [ ] 간단한 테스트 (메타데이터 저장 확인)

**산출물**:
```typescript
@Crud({ only: [CrudOperation.Index] })
@Controller('users')
export class UsersController {}

// 메타데이터 저장 확인
const config = CrudMetadataStorage.getCrudConfig(UsersController);
console.log(config.only); // [CrudOperation.Index]
```

#### Day 3-4: 동적 라우트 생성 (Index만)
- [ ] NestJS Module 라이프사이클 연동 (OnModuleInit)
- [ ] Index 엔드포인트 동적 생성 (GET /users)
- [ ] Service 메서드 호출 (findAll)
- [ ] JSON:API 응답 변환
- [ ] E2E 테스트 작성

**산출물**:
```typescript
// GET /users 자동 생성
@Crud({ only: [CrudOperation.Index] })
@Controller('users')
export class UsersController {}

// 테스트
GET /users
→ 200 OK
{
  "jsonapi": { "version": "1.1" },
  "data": [...]
}
```

#### Day 5-6: 전체 CRUD 엔드포인트 생성
- [ ] Show 엔드포인트 (GET /users/:id)
- [ ] Create 엔드포인트 (POST /users)
- [ ] Update 엔드포인트 (PATCH /users/:id)
- [ ] Delete 엔드포인트 (DELETE /users/:id)
- [ ] E2E 테스트 전체 작성

**산출물**:
```typescript
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show, CrudOperation.Create, CrudOperation.Update, CrudOperation.Delete]
})
@Controller('users')
export class UsersController {}

// 5개 엔드포인트 자동 생성
GET /users
GET /users/:id
POST /users
PATCH /users/:id
DELETE /users/:id
```

#### Day 7: 설정 통합 (필터, 정렬, 페이지네이션)
- [ ] allowedFilters 적용
- [ ] allowedSorts 적용
- [ ] allowedIncludes 적용
- [ ] pagination 적용
- [ ] 통합 테스트

**산출물**:
```typescript
@Crud({
  only: [CrudOperation.Index],
  allowedIncludes: ['profile', 'roles'],
  allowedFilters: {
    name: ['eq', 'like'],
    age: ['gte', 'lte']
  },
  allowedSorts: ['createdAt', 'name']
})
@Controller('users')
export class UsersController {}

// 요청
GET /users?filter[name][like]=John&include=profile&sort=-createdAt&page[size]=10
```

### Phase 2: 훅 시스템 (2주차) - 16-24시간

#### Day 8-9: 기본 훅 데코레이터
- [ ] @BeforeCreate 구현
- [ ] @AfterCreate 구현
- [ ] 훅 메타데이터 저장
- [ ] 훅 실행 순서 관리
- [ ] 단위 테스트

**산출물**:
```typescript
@Crud({ only: [CrudOperation.Create] })
@Controller('users')
export class UsersController {
  @BeforeCreate()
  async beforeCreateHook(@ParsedBody() dto: CreateUserDto) {
    dto.password = await hash(dto.password);
    return dto;
  }

  @AfterCreate()
  async afterCreateHook(@CreatedEntity() user: User) {
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}
```

#### Day 10-11: 전체 훅 구현
- [ ] @BeforeUpdate, @AfterUpdate
- [ ] @BeforeDelete, @AfterDelete
- [ ] 에러 처리 및 롤백
- [ ] 통합 테스트

#### Day 12: 파라미터 데코레이터
- [ ] @ParsedBody, @ParsedParams, @ParsedRequest
- [ ] @CreatedEntity, @UpdatedEntity, @DeletedEntity
- [ ] 타입 안전성 검증

#### Day 13-14: Model 훅
- [ ] @BeforeModelInit 구현
- [ ] @AfterModelInit 구현
- [ ] 작업별 실행 (operations 파라미터)
- [ ] 통합 테스트

**산출물**:
```typescript
@Crud({ only: [CrudOperation.Index, CrudOperation.Show] })
@Controller('users')
export class UsersController {
  @BeforeModelInit([CrudOperation.Show])
  async beforeShowHook(@ParsedParams() params: any) {
    if (!isValidUUID(params.id)) {
      throw new BadRequestException('Invalid ID');
    }
  }

  @AfterModelInit([CrudOperation.Index, CrudOperation.Show])
  async afterLoadHook(@LoadedEntity() entity: User | User[]) {
    // 민감 필드 제거
    return removeSensitiveFields(entity);
  }
}
```

### Phase 3: 플러그인 시스템 (3주차) - 12-18시간

#### Day 15-16: 플러그인 인터페이스
- [ ] CrudPlugin 인터페이스 정의
- [ ] 플러그인 등록 시스템
- [ ] 플러그인 초기화 (init)
- [ ] 플러그인 훅 등록 (registerHooks)

#### Day 17-18: 기본 플러그인 구현
- [ ] AuditLogPlugin 구현
- [ ] CachingPlugin 구현
- [ ] RateLimitPlugin 구현
- [ ] 플러그인 테스트

**산출물**:
```typescript
@Crud({
  only: [CrudOperation.Create, CrudOperation.Update, CrudOperation.Delete],
  plugins: [
    AuditLogPlugin,
    CachingPlugin,
    RateLimitPlugin
  ]
})
@Controller('users')
export class UsersController {}

// 플러그인 자동 실행
POST /users
→ AuditLogPlugin: 감사 로그 기록
→ CachingPlugin: 캐시 무효화
→ RateLimitPlugin: 속도 제한 체크
```

#### Day 19-20: 개별 라우트 설정
- [ ] RouteConfig 인터페이스
- [ ] 전역 + 개별 설정 병합
- [ ] 라우트별 decorators 적용
- [ ] 통합 테스트

**산출물**:
```typescript
@Crud({
  only: [CrudOperation.Index, CrudOperation.Create],
  allowedIncludes: ['profile'], // 전역

  routes: {
    [CrudOperation.Index]: {
      allowedIncludes: ['profile', 'roles'], // 개별 (오버라이드)
      pagination: { defaultLimit: 20 }
    },
    [CrudOperation.Create]: {
      decorators: [UseGuards(AuthGuard)],
      allowedParams: {
        name: { required: true },
        email: { required: true, validate: [IsEmail()] }
      }
    }
  }
})
```

#### Day 21: 문서화 및 가이드 작성
- [ ] README 업데이트
- [ ] API 레퍼런스 작성
- [ ] 마이그레이션 가이드 작성
- [ ] 예시 프로젝트 작성

### Phase 4: 최적화 및 선택 기능 (4주차) - 12-18시간

#### Day 22-23: 성능 최적화
- [ ] 쿼리 최적화 (eagerLoad, indexHints)
- [ ] 캐싱 전략 (keyStrategy, invalidateOn)
- [ ] 성능 벤치마크

#### Day 24-25: 추가 기능
- [ ] 커스텀 함수 훅 (@Before, @After)
- [ ] Swagger 고급 설정
- [ ] 커스텀 엔드포인트 생성

#### Day 26-28: 안정화 및 테스트
- [ ] 전체 E2E 테스트
- [ ] 성능 테스트
- [ ] 보안 테스트
- [ ] 버그 수정 및 리팩토링

---

## 🛠️ 기술 스택 및 의존성

### 핵심 의존성
```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@prisma/client": "^5.0.0",
    "reflect-metadata": "^0.1.13",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  },
  "devDependencies": {
    "@nestjs/testing": "^10.0.0",
    "prisma": "^5.0.0",
    "supertest": "^6.3.0",
    "jest": "^29.0.0"
  }
}
```

### 기술 선택 근거

#### 1. Reflect Metadata
- **용도**: 데코레이터 메타데이터 저장
- **이유**: NestJS 표준, 타입 안전성

#### 2. Swagger
- **용도**: API 문서 자동 생성
- **이유**: 산업 표준, NestJS 통합

#### 3. Class Validator
- **용도**: DTO 유효성 검증
- **이유**: 데코레이터 기반, 타입 안전성

#### 4. Prisma
- **용도**: ORM 및 쿼리 빌더
- **이유**: 타입 안전성, 성능, N+1 최적화

---

## ⚠️ 위험 요소 및 완화 전략

### Risk 1: 동적 라우트 생성 복잡도 🔴 높음

**위험**: NestJS 메타데이터 및 라이프사이클 이해 부족으로 구현 실패

**완화 전략**:
1. ✅ NestJS 공식 문서 및 소스 코드 분석
2. ✅ 기존 라이브러리 참고 (@nestjsx/crud, @nestjs/crud)
3. ✅ 점진적 구현 (Index만 → 전체 CRUD)
4. ✅ Context7 MCP 활용 (NestJS 패턴 검색)

**백업 계획**:
- 동적 생성 실패 시 → 코드 생성기 방식 (CLI 도구)

### Risk 2: 훅 실행 순서 관리 🟡 중간

**위험**: 훅 간 의존성 및 실행 순서 오류

**완화 전략**:
1. ✅ 명확한 실행 순서 정의 (Before → Create → After)
2. ✅ 우선순위 시스템 (플러그인 → 사용자 훅)
3. ✅ 에러 처리 및 롤백 메커니즘
4. ✅ 상세한 로깅 및 디버깅

**백업 계획**:
- 복잡도 증가 시 → 이벤트 버스 패턴 사용

### Risk 3: 플러그인 시스템 호환성 🟡 중간

**위험**: 플러그인 간 충돌 및 호환성 문제

**완화 전략**:
1. ✅ 명확한 플러그인 인터페이스 정의
2. ✅ 플러그인 격리 (독립 실행)
3. ✅ 플러그인 우선순위 시스템
4. ✅ 플러그인 테스트 프레임워크

**백업 계획**:
- 충돌 발생 시 → 플러그인 비활성화 옵션

### Risk 4: 성능 오버헤드 🟢 낮음

**위험**: 데코레이터 및 메타데이터 처리로 인한 성능 저하

**완화 전략**:
1. ✅ 메타데이터 캐싱
2. ✅ 라우트 생성 최적화 (초기화 시 한 번만)
3. ✅ 성능 벤치마크
4. ✅ 프로파일링 및 최적화

**백업 계획**:
- 성능 문제 발생 시 → 옵션으로 최적화 비활성화

### Risk 5: 타입 안전성 유지 🟡 중간

**위험**: 동적 생성으로 인한 타입 추론 실패

**완화 전략**:
1. ✅ 제네릭 타입 적극 활용
2. ✅ 타입 가드 함수 제공
3. ✅ TypeScript strict 모드
4. ✅ 타입 테스트 (tsd)

**백업 계획**:
- 타입 추론 실패 시 → 명시적 타입 선언 요구

---

## 📊 성공 지표 (KPIs)

### 개발 생산성
- ✅ Controller 코드 감소: **80% 이상** (260줄 → 50줄)
- ✅ 새 리소스 추가 시간: **10분 이내**
- ✅ 훅 추가 시간: **5분 이내**
- ✅ 플러그인 개발 시간: **30분 이내**

### 코드 품질
- ✅ 단위 테스트 커버리지: **90% 이상**
- ✅ E2E 테스트 통과율: **100%**
- ✅ TypeScript strict 모드: **100% 통과**
- ✅ Linting 에러: **0개**

### 성능
- ✅ 엔드포인트 응답 시간: **< 200ms** (기본 CRUD)
- ✅ N+1 쿼리: **0개** (eagerLoad 활성화 시)
- ✅ 메모리 오버헤드: **< 10%**

### 개발자 만족도
- ✅ 학습 곡선: **< 4시간** (기본 사용)
- ✅ 에러 메시지 명확성: **90% 이상**
- ✅ 문서 완성도: **100% (모든 기능)**

---

## 🎯 다음 단계

### Immediate (즉시 시작)
1. Phase 1 Day 1-2 시작: @Crud 데코레이터 골격 구현
2. CrudOperation enum 및 CrudConfig 인터페이스 정의
3. 메타데이터 저장 시스템 구현

### Short-term (1주일 내)
1. Phase 1 완료: 전체 CRUD 엔드포인트 자동 생성
2. 기본 E2E 테스트 작성
3. 문서 초안 작성

### Mid-term (2-3주 내)
1. Phase 2 완료: 훅 시스템 전체 구현
2. Phase 3 시작: 플러그인 시스템 구현
3. 예시 프로젝트 작성

### Long-term (4주 내)
1. Phase 3-4 완료: 전체 시스템 완성
2. 성능 최적화 및 안정화
3. 공식 릴리스 준비

---

## 📚 참고 자료

### NestJS 공식 문서
- [Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [Execution Context](https://docs.nestjs.com/fundamentals/execution-context)
- [Metadata Reflection](https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata)

### 기존 라이브러리
- [@nestjsx/crud](https://github.com/nestjsx/crud) - 참고용
- [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction) - Swagger 통합

### 관련 패턴
- Decorator Pattern
- Plugin Architecture
- Hook System (React Hooks 유사)

---

**생성일**: 2025-11-08
**최종 수정**: 2025-11-08
**작성자**: Claude Code (Opus 4.1)
