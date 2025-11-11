# 캐시 시스템 가이드

> 고성능 캐싱 시스템 - Memory/Redis 지원, 타입 안전, 자동 정리

## 📋 목차

- [개요](#개요)
- [아키텍처](#아키텍처)
- [기본 사용법](#기본-사용법)
- [고급 기능](#고급-기능)
- [설정](#설정)
- [베스트 프랙티스](#베스트-프랙티스)
- [트러블슈팅](#트러블슈팅)

---

## 개요

### 주요 기능

- ✅ **CacheService 추상화**: 고수준 캐싱 API 제공
- ✅ **타입 안전성**: TypeScript 제네릭 지원
- ✅ **자동 만료 정리**: MemoryStore 5분마다 자동 정리
- ✅ **최대 항목 제한**: MemoryStore 기본 10,000개 제한
- ✅ **Get-or-Set 패턴**: `remember()` 메서드로 간편한 캐싱
- ✅ **배치 작업**: `mget()`, `mset()`, `mdel()` 병렬 처리
- ✅ **증감 연산**: `increment()`, `decrement()` 지원
- ✅ **Memory/Redis**: 전략 패턴으로 쉬운 전환

### 시스템 구성

```
CacheModule (@Global)
    ↓
CacheService (고수준 API)
    ↓
CACHE_STORE (DI Token)
    ↓
├── MemoryStore (개발 환경)
│   - 자동 만료 정리 (5분)
│   - 최대 10,000개 항목
│   - FIFO 방식 정리
│
└── RedisStore (프로덕션 환경)
    - 분산 환경 지원
    - 영속성 보장
    - 고가용성
```

---

## 아키텍처

### 레이어 구조

```
┌─────────────────────────────────────┐
│      UsersService (비즈니스 로직)     │
│  constructor(cache: CacheService)   │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│        CacheService (추상화)         │
│  - remember(), mget(), increment()  │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│     CacheStore (인터페이스)          │
│  - get(), set(), delete()           │
└────────────┬────────────────────────┘
             │
        ┌────┴────┐
        ↓         ↓
┌─────────┐  ┌─────────┐
│ Memory  │  │  Redis  │
│  Store  │  │  Store  │
└─────────┘  └─────────┘
```

---

## 기본 사용법

### 1. CacheService 주입

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService } from '../common/cache';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly cache: CacheService) {}
}
```

### 2. 기본 CRUD

```typescript
// 캐시 저장
await this.cache.set('user:123', user, 3600); // 1시간

// 캐시 조회
const user = await this.cache.get<User>('user:123');

// 캐시 삭제
await this.cache.delete('user:123');

// 캐시 존재 확인
const exists = await this.cache.has('user:123');
```

### 3. Get-or-Set 패턴 (권장)

```typescript
/**
 * 캐시에 있으면 반환, 없으면 DB 조회 후 캐싱
 */
async findOne(id: string): Promise<User> {
  return this.cache.remember(`user:${id}`, 3600, async () => {
    return this.prisma.user.findUnique({ where: { id } });
  });
}
```

### 4. 배치 작업

```typescript
// 다중 키 조회 (병렬)
const [user1, user2, user3] = await this.cache.mget<User>([
  'user:1',
  'user:2',
  'user:3',
]);

// 다중 키 저장 (병렬)
await this.cache.mset([
  { key: 'user:1', value: user1, ttl: 3600 },
  { key: 'user:2', value: user2, ttl: 7200 },
  { key: 'user:3', value: user3 },
]);

// 다중 키 삭제 (병렬)
await this.cache.mdel(['user:1', 'user:2', 'user:3']);
```

---

## 고급 기능

### 1. 증감 연산

```typescript
// 조회수 증가
const viewCount = await this.cache.increment('post:123:views', 1, 3600);

// 재고 감소
const stock = await this.cache.decrement('product:456:stock', 5, 7200);
```

### 2. 패턴 매칭 삭제

```typescript
// 모든 사용자 캐시 삭제
await this.cache.deletePattern('^user:');

// 특정 날짜의 캐시 삭제
await this.cache.deletePattern('stats:2025-11-');
```

### 3. TTL 갱신

```typescript
// 캐시 값은 유지하고 TTL만 갱신
const success = await this.cache.touch('user:123', 7200); // 2시간 연장
```

### 4. 전체 캐시 삭제

```typescript
// ⚠️ 주의: 모든 캐시 삭제
await this.cache.clear();

// 캐시 크기 확인
const size = await this.cache.size();
console.log(`캐시 항목 수: ${size}`);
```

---

## 설정

### 환경 변수

```env
# .env

# 캐시 드라이버 (memory | redis)
CACHE_DRIVER=memory

# 기본 TTL (초 단위)
CACHE_TTL=3600

# Redis 설정 (CACHE_DRIVER=redis일 때 필수)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 설정 파일

```typescript
// src/config/cache.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  driver: process.env.CACHE_DRIVER || 'memory',
  ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
}));
```

### MemoryStore 옵션

```typescript
// src/common/cache/cache.factory.ts
private static createMemoryStore(): CacheStore {
  return new MemoryStore({
    cleanupInterval: 300000, // 5분마다 자동 정리
    maxItems: 10000,         // 최대 10,000개 항목
  });
}
```

---

## 베스트 프랙티스

### 1. 캐시 키 명명 규칙

**규칙**: `{resource}:{id}:{field?}`

```typescript
// ✅ 좋은 예시
'user:123'
'user:123:profile'
'post:456:comments'
'stats:2025-11-10:views'

// ❌ 나쁜 예시
'123' // 리소스 타입 불명확
'user_123' // 구분자 일관성 없음
'getUserById123' // 함수명 사용
```

### 2. TTL 전략

```typescript
// 사용자 프로필 (자주 변경되지 않음)
await this.cache.set('user:123:profile', profile, 3600 * 24); // 24시간

// 통계 데이터 (자주 변경됨)
await this.cache.set('stats:realtime', stats, 60); // 1분

// 세션 데이터
await this.cache.set('session:abc', session, 3600 * 2); // 2시간

// 영구 캐시 (직접 삭제 필요)
await this.cache.set('config:app', config, 3600 * 24 * 365); // 1년
```

### 3. Cache-Aside 패턴

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 조회 - Cache-Aside 패턴
   */
  async findOne(id: string): Promise<User> {
    return this.cache.remember(`user:${id}`, 3600, async () => {
      return this.prisma.user.findUnique({ where: { id } });
    });
  }

  /**
   * 생성 - Write-Through 패턴
   */
  async create(createDto: CreateUserDto): Promise<User> {
    const user = await this.prisma.user.create({ data: createDto });

    // DB 저장 후 즉시 캐싱
    await this.cache.set(`user:${user.id}`, user, 3600);

    return user;
  }

  /**
   * 수정 - 캐시 무효화
   */
  async update(id: string, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateDto,
    });

    // 캐시 무효화
    await this.cache.delete(`user:${id}`);

    return user;
  }

  /**
   * 삭제 - 캐시 무효화
   */
  async remove(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });

    // 캐시 무효화
    await this.cache.delete(`user:${id}`);
  }
}
```

### 4. 에러 처리

```typescript
async findOne(id: string): Promise<User | null> {
  try {
    // 캐시 조회 시도
    const cached = await this.cache.get<User>(`user:${id}`);
    if (cached) return cached;
  } catch (error) {
    console.error('캐시 조회 실패:', error);
    // 캐시 실패 시 DB로 폴백
  }

  // DB 조회
  const user = await this.prisma.user.findUnique({ where: { id } });

  // 캐시 저장 시도 (실패해도 서비스는 정상 동작)
  try {
    if (user) {
      await this.cache.set(`user:${id}`, user, 3600);
    }
  } catch (error) {
    console.error('캐시 저장 실패:', error);
  }

  return user;
}
```

---

## 트러블슈팅

### 1. MemoryStore 메모리 부족

**증상**: 메모리 사용량 계속 증가

**원인**: 최대 항목 수 제한 초과 또는 TTL 너무 길게 설정

**해결**:
```typescript
// 1. 최대 항목 수 늘리기
new MemoryStore({ maxItems: 50000 });

// 2. 자동 정리 간격 줄이기
new MemoryStore({ cleanupInterval: 60000 }); // 1분

// 3. TTL 줄이기
await this.cache.set(key, value, 300); // 5분
```

### 2. Redis 연결 실패

**증상**: `[RedisStore] Redis 연결 에러`

**해결**:
```bash
# 1. Redis 실행 확인
redis-cli ping
# PONG 응답 확인

# 2. 환경 변수 확인
echo $REDIS_HOST
echo $REDIS_PORT

# 3. 네트워크 확인
telnet localhost 6379
```

### 3. 캐시 히트율 낮음

**원인**: TTL 너무 짧거나 캐시 키 불일치

**해결**:
```typescript
// 1. TTL 늘리기
await this.cache.set(key, value, 7200); // 2시간

// 2. 캐시 키 일관성 확인
const key = `user:${id}`; // 일관된 키 사용

// 3. remember() 패턴 사용
return this.cache.remember(key, ttl, callback);
```

### 4. 메모리 누수

**증상**: MemoryStore 메모리 계속 증가

**원인**: 자동 정리 스케줄러 미동작 또는 disconnect() 미호출

**해결**:
```typescript
// 1. disconnect() 호출 확인
@Injectable()
export class AppService implements OnModuleDestroy {
  constructor(
    @Inject('CACHE_STORE') private store: CacheStore,
  ) {}

  async onModuleDestroy() {
    if ('disconnect' in this.store) {
      await this.store.disconnect();
    }
  }
}

// 2. 수동 정리
if ('cleanup' in this.store) {
  const cleaned = this.store.cleanup();
  console.log(`${cleaned}개 항목 정리`);
}
```

---

## 참고 자료

### 관련 문서
- [프로젝트 CLAUDE.md](../CLAUDE.md) - 전체 프로젝트 가이드
- [Common 모듈 가이드](../src/common/CLAUDE.md) - Common 모듈 상세 가이드

### 핵심 파일 위치
- CacheService: `src/common/cache/cache.service.ts`
- CacheModule: `src/common/cache/cache.module.ts`
- MemoryStore: `src/common/cache/stores/memory.store.ts`
- RedisStore: `src/common/cache/stores/redis.store.ts`
- Types: `src/common/cache/types/cache.types.ts`

---

**마지막 업데이트**: 2025-11-10
**버전**: 2.0.0 (Phase 1 개선 완료)
**작성자**: Claude Code
