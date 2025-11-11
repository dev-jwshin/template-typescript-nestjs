import { Test, TestingModule } from '@nestjs/testing';
import { CacheMetricsService } from './cache-metrics.service';

describe('CacheMetricsService', () => {
  let service: CacheMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheMetricsService],
    }).compile();

    service = module.get<CacheMetricsService>(CacheMetricsService);
  });

  describe('기본 메트릭 기록', () => {
    it('정의되어야 함', () => {
      expect(service).toBeDefined();
    });

    it('recordHit() - 히트 수를 증가시켜야 함', () => {
      service.recordHit();
      service.recordHit();

      const metrics = service.getMetrics();
      expect(metrics.hits).toBe(2);
    });

    it('recordMiss() - 미스 수를 증가시켜야 함', () => {
      service.recordMiss();
      service.recordMiss();
      service.recordMiss();

      const metrics = service.getMetrics();
      expect(metrics.misses).toBe(3);
    });

    it('recordSet() - set 작업 수를 증가시켜야 함', () => {
      service.recordSet();

      const metrics = service.getMetrics();
      expect(metrics.sets).toBe(1);
    });

    it('recordDelete() - delete 작업 수를 증가시켜야 함', () => {
      service.recordDelete();
      service.recordDelete();

      const metrics = service.getMetrics();
      expect(metrics.deletes).toBe(2);
    });
  });

  describe('히트율 계산', () => {
    it('히트와 미스가 없으면 0을 반환해야 함', () => {
      const metrics = service.getMetrics();
      expect(metrics.hitRate).toBe(0);
    });

    it('모든 요청이 히트인 경우 100%를 반환해야 함', () => {
      service.recordHit();
      service.recordHit();
      service.recordHit();

      const metrics = service.getMetrics();
      expect(metrics.hitRate).toBe(100);
    });

    it('모든 요청이 미스인 경우 0%를 반환해야 함', () => {
      service.recordMiss();
      service.recordMiss();
      service.recordMiss();

      const metrics = service.getMetrics();
      expect(metrics.hitRate).toBe(0);
    });

    it('히트율을 정확하게 계산해야 함', () => {
      service.recordHit(); // 1 hit
      service.recordHit(); // 2 hits
      service.recordMiss(); // 1 miss
      service.recordMiss(); // 2 misses

      // 2 hits / 4 total = 50%
      const metrics = service.getMetrics();
      expect(metrics.hitRate).toBe(50);
    });

    it('히트율을 소수점 2자리로 반올림해야 함', () => {
      service.recordHit(); // 1
      service.recordHit(); // 2
      service.recordMiss(); // 1
      service.recordMiss(); // 2
      service.recordMiss(); // 3

      // 2 hits / 5 total = 40%
      const metrics = service.getMetrics();
      expect(metrics.hitRate).toBe(40);
    });
  });

  describe('작업 시간 추적', () => {
    it('recordGetTime() - get 작업 시간을 기록해야 함', () => {
      service.recordGetTime(10);
      service.recordGetTime(20);
      service.recordGetTime(30);

      const metrics = service.getMetrics();
      expect(metrics.avgGetTime).toBe(20); // (10 + 20 + 30) / 3
    });

    it('recordSetTime() - set 작업 시간을 기록해야 함', () => {
      service.recordSetTime(5);
      service.recordSetTime(15);
      service.recordSetTime(10);

      const metrics = service.getMetrics();
      expect(metrics.avgSetTime).toBe(10); // (5 + 15 + 10) / 3
    });

    it('평균 시간을 소수점 2자리로 반올림해야 함', () => {
      service.recordGetTime(10);
      service.recordGetTime(11);
      service.recordGetTime(12);

      const metrics = service.getMetrics();
      expect(metrics.avgGetTime).toBe(11); // (10 + 11 + 12) / 3 = 11
    });

    it('시간 기록이 없으면 avgTime은 undefined여야 함', () => {
      const metrics = service.getMetrics();
      expect(metrics.avgGetTime).toBeUndefined();
      expect(metrics.avgSetTime).toBeUndefined();
    });
  });

  describe('백분위수 계산', () => {
    it('getPercentiles() - get 작업의 백분위수를 계산해야 함', () => {
      const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      times.forEach((time) => service.recordGetTime(time));

      const percentiles = service.getPercentiles('get');

      expect(percentiles.p50).toBeDefined();
      expect(percentiles.p95).toBeDefined();
      expect(percentiles.p99).toBeDefined();
      expect(percentiles.p50).toBeLessThanOrEqual(percentiles.p95);
      expect(percentiles.p95).toBeLessThanOrEqual(percentiles.p99);
    });

    it('getPercentiles() - set 작업의 백분위수를 계산해야 함', () => {
      const times = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
      times.forEach((time) => service.recordSetTime(time));

      const percentiles = service.getPercentiles('set');

      expect(percentiles.p50).toBeDefined();
      expect(percentiles.p95).toBeDefined();
      expect(percentiles.p99).toBeDefined();
    });

    it('데이터가 충분하지 않으면 백분위수는 0이어야 함', () => {
      service.recordGetTime(10);

      const percentiles = service.getPercentiles('get');

      expect(percentiles.p50).toBe(10);
      expect(percentiles.p95).toBe(10);
      expect(percentiles.p99).toBe(10);
    });

    it('데이터가 없으면 백분위수는 0이어야 함', () => {
      const percentiles = service.getPercentiles('get');

      expect(percentiles.p50).toBe(0);
      expect(percentiles.p95).toBe(0);
      expect(percentiles.p99).toBe(0);
    });
  });

  describe('메트릭 초기화', () => {
    it('reset() - 모든 메트릭을 초기화해야 함', () => {
      service.recordHit();
      service.recordMiss();
      service.recordSet();
      service.recordDelete();
      service.recordGetTime(10);
      service.recordSetTime(20);

      service.reset();

      const metrics = service.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.sets).toBe(0);
      expect(metrics.deletes).toBe(0);
      expect(metrics.hitRate).toBe(0);
      expect(metrics.avgGetTime).toBeUndefined();
      expect(metrics.avgSetTime).toBeUndefined();
    });
  });

  describe('메트릭 조회', () => {
    it('getMetrics() - 모든 메트릭을 반환해야 함', () => {
      service.recordHit();
      service.recordMiss();
      service.recordSet();
      service.recordDelete();

      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('hits');
      expect(metrics).toHaveProperty('misses');
      expect(metrics).toHaveProperty('sets');
      expect(metrics).toHaveProperty('deletes');
      expect(metrics).toHaveProperty('hitRate');
    });

    it('getMetrics() - 시간 메트릭을 포함해야 함', () => {
      service.recordGetTime(10);
      service.recordSetTime(20);

      const metrics = service.getMetrics();

      expect(metrics.avgGetTime).toBe(10);
      expect(metrics.avgSetTime).toBe(20);
    });
  });

  describe('성능 추적', () => {
    it('많은 수의 메트릭을 처리할 수 있어야 함', () => {
      for (let i = 0; i < 1000; i++) {
        service.recordHit();
        service.recordMiss();
        service.recordGetTime(Math.random() * 100);
        service.recordSetTime(Math.random() * 100);
      }

      const metrics = service.getMetrics();

      expect(metrics.hits).toBe(1000);
      expect(metrics.misses).toBe(1000);
      expect(metrics.avgGetTime).toBeDefined();
      expect(metrics.avgSetTime).toBeDefined();
    });

    it('백분위수 계산이 큰 데이터셋에서 작동해야 함', () => {
      for (let i = 1; i <= 1000; i++) {
        service.recordGetTime(i);
      }

      const percentiles = service.getPercentiles('get');

      expect(percentiles.p50).toBeGreaterThan(400);
      expect(percentiles.p50).toBeLessThan(600);
      expect(percentiles.p95).toBeGreaterThan(900);
      expect(percentiles.p99).toBeGreaterThan(980);
    });
  });

  describe('엣지 케이스', () => {
    it('음수 시간 값은 무시되어야 함', () => {
      service.recordGetTime(-10);
      service.recordGetTime(10);

      const metrics = service.getMetrics();

      // 음수 값은 기록되지 않아야 함
      expect(metrics.avgGetTime).toBeGreaterThanOrEqual(0);
    });

    it('매우 큰 시간 값을 처리할 수 있어야 함', () => {
      service.recordGetTime(1000000);
      service.recordGetTime(2000000);

      const metrics = service.getMetrics();

      expect(metrics.avgGetTime).toBe(1500000);
    });

    it('0ms 작업 시간을 처리할 수 있어야 함', () => {
      service.recordGetTime(0);
      service.recordSetTime(0);

      const metrics = service.getMetrics();

      expect(metrics.avgGetTime).toBe(0);
      expect(metrics.avgSetTime).toBe(0);
    });
  });

  describe('실시간 메트릭 업데이트', () => {
    it('메트릭이 실시간으로 업데이트되어야 함', () => {
      expect(service.getMetrics().hits).toBe(0);

      service.recordHit();
      expect(service.getMetrics().hits).toBe(1);

      service.recordHit();
      expect(service.getMetrics().hits).toBe(2);
    });

    it('히트율이 실시간으로 업데이트되어야 함', () => {
      expect(service.getMetrics().hitRate).toBe(0);

      service.recordHit();
      expect(service.getMetrics().hitRate).toBe(100);

      service.recordMiss();
      expect(service.getMetrics().hitRate).toBe(50);

      service.recordHit();
      expect(service.getMetrics().hitRate).toBeCloseTo(66.67, 1);
    });
  });
});
