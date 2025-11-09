import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Injectable } from '@nestjs/common';
import request from 'supertest';
import { Crud } from '../decorators/crud.decorator';
import { BeforeCreate, AfterCreate } from '../decorators/hook.decorator';
import { ParsedBody, CreatedEntity } from '../decorators/param.decorator';
import { CrudOperation } from '../types/crud-operation.enum';
import { withCachingOptions } from '../plugins/caching.plugin';
import { CrudPerformanceService } from '../services/crud-performance.service';

/**
 * Mock Service for Benchmark
 */
@Injectable()
class BenchmarkService {
  private items: any[] = [];

  constructor() {
    // 초기 데이터 생성 (1000개)
    for (let i = 1; i <= 1000; i++) {
      this.items.push({
        id: String(i),
        name: `Item ${i}`,
        description: `Description for item ${i}`,
        price: Math.random() * 1000,
        category: ['electronics', 'books', 'clothing'][i % 3],
        inStock: i % 2 === 0,
        createdAt: new Date(2025, 0, i % 30),
      });
    }
  }

  async findAll(options?: any) {
    let result = [...this.items];

    // 필터링
    if (options?.filter) {
      result = result.filter((item) => {
        for (const [field, condition] of Object.entries(options.filter)) {
          const value = (condition as any).value;
          const operator = (condition as any).operator;

          if (operator === 'eq' && item[field] !== value) return false;
          if (operator === 'gte' && item[field] < value) return false;
          if (operator === 'lte' && item[field] > value) return false;
        }
        return true;
      });
    }

    // 정렬
    if (options?.sort) {
      result.sort((a, b) => {
        for (const { field, order } of options.sort) {
          const comparison = a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0;
          if (comparison !== 0) {
            return order === 'ASC' ? comparison : -comparison;
          }
        }
        return 0;
      });
    }

    // 페이지네이션
    if (options?.page) {
      const start = (options.page.number - 1) * options.page.size;
      result = result.slice(start, start + options.page.size);
    }

    return result;
  }

  async findOne(id: string) {
    return this.items.find((i) => i.id === id);
  }

  async create(dto: any) {
    const newItem = {
      id: String(this.items.length + 1),
      ...dto,
      createdAt: new Date(),
    };
    this.items.push(newItem);
    return newItem;
  }
}

/**
 * 기본 컨트롤러 (최적화 없음)
 */
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show, CrudOperation.Create],
  resourceType: 'basic-items',
  allowedParams: {
    name: { required: true },
    description: { required: false },
    price: { required: false },
  },
})
@Controller('basic-items')
class BasicController {
  constructor(private readonly service: BenchmarkService) {}
}

/**
 * 캐싱 적용 컨트롤러
 */
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show],
  resourceType: 'cached-items',
  plugins: [
    withCachingOptions({
      ttl: 60,
      keyPrefix: 'cached-items',
      cacheIndex: true,
      cacheShow: true,
    }),
  ],
})
@Controller('cached-items')
class CachedController {
  constructor(private readonly service: BenchmarkService) {}
}

/**
 * 훅 적용 컨트롤러
 */
@Crud({
  only: [CrudOperation.Create],
  resourceType: 'hook-items',
  allowedParams: {
    name: { required: true },
    description: { required: false },
  },
})
@Controller('hook-items')
class HookController {
  constructor(private readonly service: BenchmarkService) {}

  @BeforeCreate()
  async beforeCreate(@ParsedBody() dto: any) {
    // 간단한 변환
    dto.name = dto.name.toUpperCase();
    dto.createdAt = new Date();
    return dto;
  }

  @AfterCreate()
  async afterCreate(@CreatedEntity() entity: any) {
    // 추가 처리
    entity.processed = true;
    return entity;
  }
}

/**
 * 성능 벤치마크 테스트
 */
describe('CRUD 시스템 성능 벤치마크', () => {
  let app: INestApplication;
  let performanceService: CrudPerformanceService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BasicController, CachedController, HookController],
      providers: [BenchmarkService, CrudPerformanceService],
    }).compile();

    app = moduleFixture.createNestApplication();
    performanceService = moduleFixture.get<CrudPerformanceService>(CrudPerformanceService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('응답 시간 벤치마크', () => {
    it('기본 Index 엔드포인트 응답 시간 < 200ms', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/basic-items')
        .expect(200);

      const duration = Date.now() - start;

      console.log(`[Benchmark] Basic Index: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });

    it('캐싱 적용 Index 엔드포인트 (첫 요청)', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/cached-items')
        .expect(200);

      const duration = Date.now() - start;

      console.log(`[Benchmark] Cached Index (first): ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });

    it('캐싱 적용 Index 엔드포인트 (두 번째 요청 - 캐시 히트)', async () => {
      // 첫 요청 (캐시 채우기)
      await request(app.getHttpServer()).get('/cached-items');

      // 두 번째 요청 (캐시 히트)
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/cached-items')
        .expect(200);

      const duration = Date.now() - start;

      console.log(`[Benchmark] Cached Index (cache hit): ${duration}ms`);

      // 캐시 히트는 50ms 이내여야 함
      expect(duration).toBeLessThan(50);
    });

    it('Show 엔드포인트 응답 시간 < 150ms', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/basic-items/1')
        .expect(200);

      const duration = Date.now() - start;

      console.log(`[Benchmark] Show: ${duration}ms`);
      expect(duration).toBeLessThan(150);
    });

    it('Create 엔드포인트 응답 시간 < 200ms', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .post('/basic-items')
        .send({ name: 'Benchmark Item' })
        .expect(201);

      const duration = Date.now() - start;

      console.log(`[Benchmark] Create: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });

    it('훅이 포함된 Create 엔드포인트 < 250ms', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .post('/hook-items')
        .send({ name: 'test' })
        .expect(201);

      const duration = Date.now() - start;

      console.log(`[Benchmark] Create with Hooks: ${duration}ms`);
      expect(duration).toBeLessThan(250);
    });
  });

  describe('처리량 벤치마크', () => {
    it('1초 동안 처리 가능한 Index 요청 수', async () => {
      const duration = 1000; // 1초
      const startTime = Date.now();
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        await request(app.getHttpServer()).get('/basic-items');
        requestCount++;
      }

      console.log(`[Benchmark] Throughput (Index): ${requestCount} requests/sec`);

      // 최소 10 requests/sec
      expect(requestCount).toBeGreaterThanOrEqual(10);
    });

    it('동시 요청 처리 (10개 병렬)', async () => {
      const start = Date.now();

      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).get('/basic-items'),
      );

      await Promise.all(promises);

      const duration = Date.now() - start;

      console.log(`[Benchmark] Concurrent 10 requests: ${duration}ms`);

      // 10개 동시 요청이 1초 내에 완료되어야 함
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('메모리 사용량 벤치마크', () => {
    it('대량 데이터 조회 시 메모리 증가 < 50MB', async () => {
      const before = process.memoryUsage().heapUsed / 1024 / 1024; // MB

      // 1000개 아이템 조회
      await request(app.getHttpServer())
        .get('/basic-items?page[size]=1000')
        .expect(200);

      const after = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const increase = after - before;

      console.log(`[Benchmark] Memory increase: ${increase.toFixed(2)}MB`);

      expect(increase).toBeLessThan(50);
    });
  });

  describe('캐싱 효과 측정', () => {
    it('캐시 적용 시 응답 시간 개선율 > 50%', async () => {
      // 캐시 없는 요청
      const uncachedStart = Date.now();
      await request(app.getHttpServer()).get('/basic-items');
      const uncachedDuration = Date.now() - uncachedStart;

      // 캐시 적용 첫 요청
      await request(app.getHttpServer()).get('/cached-items');

      // 캐시 적용 두 번째 요청 (캐시 히트)
      const cachedStart = Date.now();
      await request(app.getHttpServer()).get('/cached-items');
      const cachedDuration = Date.now() - cachedStart;

      const improvement = ((uncachedDuration - cachedDuration) / uncachedDuration) * 100;

      console.log(`[Benchmark] Cache improvement: ${improvement.toFixed(2)}%`);
      console.log(`  - Without cache: ${uncachedDuration}ms`);
      console.log(`  - With cache: ${cachedDuration}ms`);

      expect(improvement).toBeGreaterThan(50);
    });

    it('캐시 통계 확인', async () => {
      // 캐시 초기화
      performanceService.clearCache();

      // 여러 요청 수행
      await request(app.getHttpServer()).get('/cached-items');
      await request(app.getHttpServer()).get('/cached-items/1');
      await request(app.getHttpServer()).get('/cached-items');

      const stats = performanceService.getCacheStats();

      console.log(`[Benchmark] Cache stats:`, stats);

      // 캐시에 항목이 저장되었는지 확인
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('성능 서비스 단위 테스트', () => {
    it('Eager Loading 적용 테스트', () => {
      const allowedIncludes = ['profile', 'roles', 'profile.avatar'];
      const requestedIncludes = ['profile', 'roles'];

      const result = performanceService.applyEagerLoading(
        allowedIncludes,
        requestedIncludes,
      );

      expect(result).toHaveProperty('profile');
      expect(result).toHaveProperty('roles');
      expect(result).not.toHaveProperty('profile.avatar');
    });

    it('쿼리 타임아웃 테스트', async () => {
      const slowQuery = new Promise((resolve) => setTimeout(resolve, 2000));

      await expect(
        performanceService.applyQueryTimeout(slowQuery, 1000),
      ).rejects.toThrow('Query timeout');
    });

    it('데이터 스트리밍 테스트', async () => {
      const data = Array.from({ length: 250 }, (_, i) => ({ id: i }));
      const chunks: any[][] = [];

      for await (const chunk of performanceService.streamData(data, 100)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(3); // 100, 100, 50
      expect(chunks[0].length).toBe(100);
      expect(chunks[1].length).toBe(100);
      expect(chunks[2].length).toBe(50);
    });
  });

  describe('성능 목표 달성 확인', () => {
    it('📊 성능 지표 요약', async () => {
      console.log('\n========== 성능 벤치마크 요약 ==========');

      // 1. Index 엔드포인트
      const indexStart = Date.now();
      await request(app.getHttpServer()).get('/basic-items');
      const indexDuration = Date.now() - indexStart;

      console.log(`✅ Index 응답 시간: ${indexDuration}ms (목표: <200ms)`);
      expect(indexDuration).toBeLessThan(200);

      // 2. Show 엔드포인트
      const showStart = Date.now();
      await request(app.getHttpServer()).get('/basic-items/1');
      const showDuration = Date.now() - showStart;

      console.log(`✅ Show 응답 시간: ${showDuration}ms (목표: <150ms)`);
      expect(showDuration).toBeLessThan(150);

      // 3. Create 엔드포인트
      const createStart = Date.now();
      await request(app.getHttpServer())
        .post('/basic-items')
        .send({ name: 'Performance Test' });
      const createDuration = Date.now() - createStart;

      console.log(`✅ Create 응답 시간: ${createDuration}ms (목표: <200ms)`);
      expect(createDuration).toBeLessThan(200);

      // 4. 캐시 효과
      await request(app.getHttpServer()).get('/cached-items');
      const cachedStart = Date.now();
      await request(app.getHttpServer()).get('/cached-items');
      const cachedDuration = Date.now() - cachedStart;

      console.log(`✅ 캐시 적용 시: ${cachedDuration}ms (목표: <50ms)`);
      expect(cachedDuration).toBeLessThan(50);

      // 5. 메모리 사용량
      const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
      await request(app.getHttpServer()).get('/basic-items?page[size]=1000');
      const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memIncrease = memAfter - memBefore;

      console.log(`✅ 메모리 증가: ${memIncrease.toFixed(2)}MB (목표: <50MB)`);
      expect(memIncrease).toBeLessThan(50);

      console.log('=======================================\n');
    });
  });
});
