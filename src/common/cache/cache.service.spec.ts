import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheStore } from './interfaces/cache-store.interface';
import { CacheMetricsService } from './metrics/cache-metrics.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockStore: jest.Mocked<CacheStore>;
  let metricsService: CacheMetricsService;

  beforeEach(async () => {
    // Mock CacheStore 생성
    mockStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      keys: jest.fn(),
      deletePattern: jest.fn(),
      size: jest.fn(),
      isConnected: jest.fn(),
    };

    // Mock ConfigService 생성
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'cache.ttl') return defaultValue ?? 3600;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: 'CACHE_STORE',
          useValue: mockStore,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        CacheMetricsService,
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    metricsService = module.get<CacheMetricsService>(CacheMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('기본 캐시 작업', () => {
    it('정의되어야 함', () => {
      expect(service).toBeDefined();
    });

    it('get() - 캐시에서 값을 가져와야 함', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      mockStore.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(mockStore.get).toHaveBeenCalledWith(key);
    });

    it('get() - 캐시 히트 시 메트릭을 기록해야 함', async () => {
      const key = 'test-key';
      mockStore.get.mockResolvedValue('value');

      await service.get(key);

      const metrics = metricsService.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(0);
    });

    it('get() - 캐시 미스 시 메트릭을 기록해야 함', async () => {
      const key = 'test-key';
      mockStore.get.mockResolvedValue(null);

      await service.get(key);

      const metrics = metricsService.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(1);
    });

    it('set() - 캐시에 값을 저장해야 함', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const ttl = 3600;

      await service.set(key, value, ttl);

      expect(mockStore.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it('delete() - 캐시에서 값을 삭제해야 함', async () => {
      const key = 'test-key';
      mockStore.delete.mockResolvedValue(true);

      const result = await service.delete(key);

      expect(result).toBe(true);
      expect(mockStore.delete).toHaveBeenCalledWith(key);
    });

    it('clear() - 모든 캐시를 삭제해야 함', async () => {
      await service.clear();

      expect(mockStore.clear).toHaveBeenCalled();
    });

    it('has() - 캐시 존재 여부를 확인해야 함', async () => {
      const key = 'test-key';
      mockStore.get.mockResolvedValue('some-value');

      const result = await service.has(key);

      expect(result).toBe(true);
      expect(mockStore.get).toHaveBeenCalledWith(key);
    });
  });

  describe('remember() 패턴', () => {
    it('캐시에 값이 있으면 콜백을 실행하지 않아야 함', async () => {
      const key = 'test-key';
      const cachedValue = { data: 'cached' };
      const callback = jest.fn();

      mockStore.get.mockResolvedValue(cachedValue);

      const result = await service.remember(key, 3600, callback);

      expect(result).toEqual(cachedValue);
      expect(callback).not.toHaveBeenCalled();
      expect(mockStore.get).toHaveBeenCalledWith(key);
    });

    it('캐시에 값이 없으면 콜백을 실행하고 결과를 저장해야 함', async () => {
      const key = 'test-key';
      const newValue = { data: 'new' };
      const ttl = 3600;
      const callback = jest.fn().mockResolvedValue(newValue);

      mockStore.get.mockResolvedValue(null);

      const result = await service.remember(key, ttl, callback);

      expect(result).toEqual(newValue);
      expect(callback).toHaveBeenCalled();
      expect(mockStore.set).toHaveBeenCalledWith(key, newValue, ttl);
    });

    it('콜백에서 에러가 발생하면 전파되어야 함', async () => {
      const key = 'test-key';
      const error = new Error('Callback error');
      const callback = jest.fn().mockRejectedValue(error);

      mockStore.get.mockResolvedValue(null);

      await expect(service.remember(key, 3600, callback)).rejects.toThrow(
        error,
      );
    });
  });

  describe('다중 키 작업', () => {
    it('mget() - 여러 키의 값을 가져와야 함', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = ['value1', 'value2', null];

      mockStore.get
        .mockResolvedValueOnce(values[0])
        .mockResolvedValueOnce(values[1])
        .mockResolvedValueOnce(values[2]);

      const result = await service.mget(keys);

      expect(result).toEqual(values);
      expect(mockStore.get).toHaveBeenCalledTimes(3);
    });

    it('mset() - 여러 키에 값을 저장해야 함', async () => {
      const entries = [
        { key: 'key1', value: 'value1', ttl: 3600 },
        { key: 'key2', value: 'value2', ttl: 7200 },
      ];

      await service.mset(entries);

      expect(mockStore.set).toHaveBeenCalledTimes(2);
      expect(mockStore.set).toHaveBeenCalledWith('key1', 'value1', 3600);
      expect(mockStore.set).toHaveBeenCalledWith('key2', 'value2', 7200);
    });

    it('deleteMany() - 여러 키를 삭제해야 함', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockStore.delete.mockResolvedValue(true);

      const result = await service.deleteMany(keys);

      expect(result).toBe(3);
      expect(mockStore.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('증감 작업', () => {
    it('increment() - 값을 증가시켜야 함', async () => {
      const key = 'counter';
      mockStore.get.mockResolvedValue(5);

      const result = await service.increment(key, 3);

      expect(result).toBe(8);
      expect(mockStore.set).toHaveBeenCalledWith(key, 8, 3600);
    });

    it('increment() - 값이 없으면 delta로 초기화해야 함', async () => {
      const key = 'counter';
      mockStore.get.mockResolvedValue(null);

      const result = await service.increment(key, 5);

      expect(result).toBe(5);
      expect(mockStore.set).toHaveBeenCalledWith(key, 5, 3600);
    });

    it('decrement() - 값을 감소시켜야 함', async () => {
      const key = 'counter';
      mockStore.get.mockResolvedValue(10);

      const result = await service.decrement(key, 3);

      expect(result).toBe(7);
      expect(mockStore.set).toHaveBeenCalledWith(key, 7, 3600);
    });

    it('decrement() - 값이 없으면 -delta로 초기화해야 함', async () => {
      const key = 'counter';
      mockStore.get.mockResolvedValue(null);

      const result = await service.decrement(key, 5);

      expect(result).toBe(-5);
      expect(mockStore.set).toHaveBeenCalledWith(key, -5, 3600);
    });
  });

  describe('패턴 작업', () => {
    it('deletePattern() - 패턴에 맞는 키들을 삭제해야 함', async () => {
      const pattern = 'user:*';
      mockStore.deletePattern.mockResolvedValue(5);

      const result = await service.deletePattern(pattern);

      expect(result).toBe(5);
      expect(mockStore.deletePattern).toHaveBeenCalledWith(pattern);
    });

    it('keys() - 모든 키를 반환해야 함', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockStore.keys.mockResolvedValue(keys);

      const result = await service.keys();

      expect(result).toEqual(keys);
      expect(mockStore.keys).toHaveBeenCalled();
    });
  });

  describe('메트릭 통합', () => {
    it('getMetrics() - 캐시 메트릭을 반환해야 함', () => {
      // 몇 가지 작업 수행
      mockStore.get.mockResolvedValue('value');
      service.get('key1');
      service.get('key2');

      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('hits');
      expect(metrics).toHaveProperty('misses');
      expect(metrics).toHaveProperty('hitRate');
    });

    it('resetMetrics() - 메트릭을 초기화해야 함', async () => {
      mockStore.get.mockResolvedValue('value');
      await service.get('key');

      service.resetMetrics();

      const metrics = service.getMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics!.hits).toBe(0);
      expect(metrics!.misses).toBe(0);
    });
  });

  describe('TTL 관리', () => {
    it('기본 TTL을 사용해야 함', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await service.set(key, value);

      expect(mockStore.set).toHaveBeenCalledWith(key, value, 3600);
    });

    it('사용자 정의 TTL을 사용해야 함', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 7200;

      await service.set(key, value, ttl);

      expect(mockStore.set).toHaveBeenCalledWith(key, value, ttl);
    });
  });
});
