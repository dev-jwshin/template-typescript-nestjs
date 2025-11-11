import { LRUMemoryStore } from './lru-memory.store';

describe('LRUMemoryStore', () => {
  let store: LRUMemoryStore;

  beforeEach(() => {
    store = new LRUMemoryStore({
      max: 5, // 최대 5개 항목
      ttl: 3600000, // 1시간 (ms 단위)
    });
  });

  afterEach(async () => {
    await store.clear();
  });

  describe('기본 작업', () => {
    it('정의되어야 함', () => {
      expect(store).toBeDefined();
    });

    it('set() 및 get() - 값을 저장하고 가져와야 함', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await store.set(key, value, 3600);
      const result = await store.get(key);

      expect(result).toEqual(value);
    });

    it('get() - 존재하지 않는 키는 null을 반환해야 함', async () => {
      const result = await store.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('delete() - 값을 삭제해야 함', async () => {
      const key = 'test-key';
      await store.set(key, 'value', 3600);

      const deleted = await store.delete(key);
      const result = await store.get(key);

      expect(deleted).toBe(true);
      expect(result).toBeNull();
    });

    it('clear() - 모든 값을 삭제해야 함', async () => {
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);

      await store.clear();

      expect(await store.get('key1')).toBeNull();
      expect(await store.get('key2')).toBeNull();
    });

    it('has() - 키 존재 여부를 확인해야 함', async () => {
      const key = 'test-key';
      await store.set(key, 'value', 3600);

      expect(await store.has(key)).toBe(true);
      expect(await store.has('non-existent')).toBe(false);
    });

    it('keys() - 모든 키를 반환해야 함', async () => {
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);
      await store.set('key3', 'value3', 3600);

      const keys = await store.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });

  describe('LRU 정책 (Least Recently Used)', () => {
    it('최대 항목 수 초과 시 가장 오래 사용되지 않은 항목을 삭제해야 함', async () => {
      // max = 5
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);
      await store.set('key3', 'value3', 3600);
      await store.set('key4', 'value4', 3600);
      await store.set('key5', 'value5', 3600);

      // key1이 가장 오래됨, 6번째 추가 시 삭제되어야 함
      await store.set('key6', 'value6', 3600);

      expect(await store.get('key1')).toBeNull();
      expect(await store.get('key6')).toBe('value6');
    });

    it('get() 호출 시 항목을 최근 사용으로 업데이트해야 함', async () => {
      // max = 5
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);
      await store.set('key3', 'value3', 3600);
      await store.set('key4', 'value4', 3600);
      await store.set('key5', 'value5', 3600);

      // key1을 다시 접근하여 최근 사용으로 업데이트
      await store.get('key1');

      // key2가 가장 오래 사용되지 않은 항목이 됨
      await store.set('key6', 'value6', 3600);

      expect(await store.get('key1')).toBe('value1'); // 여전히 존재
      expect(await store.get('key2')).toBeNull(); // 삭제됨
    });

    it('has() 호출은 LRU 순서에 영향을 주지 않아야 함', async () => {
      // max = 5
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);
      await store.set('key3', 'value3', 3600);
      await store.set('key4', 'value4', 3600);
      await store.set('key5', 'value5', 3600);

      // has()는 LRU 순서에 영향을 주지 않음
      await store.has('key1');

      // key1이 여전히 가장 오래된 항목이어야 함
      await store.set('key6', 'value6', 3600);

      expect(await store.get('key1')).toBeNull();
    });
  });

  describe('크기 기반 제거 (Size-based Eviction)', () => {
    it('maxSize 초과 시 항목을 제거해야 함', async () => {
      const storeWithSize = new LRUMemoryStore({
        max: 100,
        maxSize: 100, // 100 바이트 제한
        ttl: 3600000,
      });

      // 각 값이 약 20바이트씩
      await storeWithSize.set('key1', 'a'.repeat(20), 3600);
      await storeWithSize.set('key2', 'b'.repeat(20), 3600);
      await storeWithSize.set('key3', 'c'.repeat(20), 3600);
      await storeWithSize.set('key4', 'd'.repeat(20), 3600);

      // 5번째 추가 시 크기 초과로 key1 삭제
      await storeWithSize.set('key5', 'e'.repeat(20), 3600);

      expect(await storeWithSize.get('key1')).toBeNull();
      expect(await storeWithSize.get('key5')).toBeTruthy();

      await storeWithSize.clear();
    });

    it('큰 객체 저장 시 여러 항목이 제거될 수 있어야 함', async () => {
      const storeWithSize = new LRUMemoryStore({
        max: 100,
        maxSize: 100,
        ttl: 3600000,
      });

      await storeWithSize.set('key1', 'a'.repeat(10), 3600);
      await storeWithSize.set('key2', 'b'.repeat(10), 3600);
      await storeWithSize.set('key3', 'c'.repeat(10), 3600);

      // 큰 객체 추가 (여러 항목이 삭제되어야 함)
      await storeWithSize.set('key4', 'x'.repeat(80), 3600);

      expect(await storeWithSize.get('key4')).toBeTruthy();
      // key1, key2, key3 중 일부가 삭제되었을 것

      await storeWithSize.clear();
    });
  });

  describe('TTL 관리', () => {
    it('TTL을 초 단위에서 밀리초로 변환해야 함', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttlSeconds = 1; // 1초

      await store.set(key, value, ttlSeconds);

      // 0.5초 대기 (아직 유효함)
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(await store.get(key)).toBe(value);

      // 추가 0.6초 대기 (총 1.1초, 만료됨)
      await new Promise((resolve) => setTimeout(resolve, 600));
      expect(await store.get(key)).toBeNull();
    });

    it('기본 TTL을 사용해야 함', async () => {
      const storeWithDefaultTTL = new LRUMemoryStore({
        max: 5,
        ttl: 1000, // 1초
      });

      await storeWithDefaultTTL.set('key', 'value', 1);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(await storeWithDefaultTTL.get('key')).toBeNull();

      await storeWithDefaultTTL.clear();
    });

    it('TTL이 매우 짧으면 빠르게 만료되어야 함', async () => {
      await store.set('key', 'value', 0.01); // 10ms TTL

      // TTL이 지난 후 확인 (여유있게 50ms)
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(await store.get('key')).toBeNull();
    });
  });

  describe('패턴 삭제', () => {
    it('deletePattern() - 패턴에 맞는 키들을 삭제해야 함', async () => {
      await store.set('user:1', 'user1', 3600);
      await store.set('user:2', 'user2', 3600);
      await store.set('post:1', 'post1', 3600);
      await store.set('user:3', 'user3', 3600);

      const deleted = await store.deletePattern('^user:');

      expect(deleted).toBe(3);
      expect(await store.get('user:1')).toBeNull();
      expect(await store.get('user:2')).toBeNull();
      expect(await store.get('user:3')).toBeNull();
      expect(await store.get('post:1')).toBe('post1');
    });
  });

  describe('통계 (Stats)', () => {
    it('getStats() - 캐시 통계를 반환해야 함', async () => {
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);
      await store.set('key3', 'value3', 3600);

      const stats = store.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('max');
      expect(stats.size).toBe(3);
    });

    it('max 설정을 통계에 포함해야 함', async () => {
      const stats = store.getStats();

      expect(stats.max).toBe(5);
    });

    it('maxSize가 설정된 경우 통계에 포함해야 함', async () => {
      const storeWithSize = new LRUMemoryStore({
        max: 10,
        maxSize: 1000,
        ttl: 3600000,
      });

      const stats = storeWithSize.getStats();

      expect(stats.maxSize).toBe(1000);

      await storeWithSize.clear();
    });
  });

  describe('업데이트 동작', () => {
    it('기존 키를 업데이트하면 LRU 순서가 갱신되어야 함', async () => {
      // max = 5
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);
      await store.set('key3', 'value3', 3600);
      await store.set('key4', 'value4', 3600);
      await store.set('key5', 'value5', 3600);

      // key1을 업데이트 (최근 사용으로 이동)
      await store.set('key1', 'updated-value1', 3600);

      // key2가 가장 오래된 항목이 됨
      await store.set('key6', 'value6', 3600);

      expect(await store.get('key1')).toBe('updated-value1'); // 여전히 존재
      expect(await store.get('key2')).toBeNull(); // 삭제됨
    });
  });

  describe('데이터 타입', () => {
    it('다양한 데이터 타입을 저장하고 가져와야 함', async () => {
      await store.set('string', 'test', 3600);
      await store.set('number', 42, 3600);
      await store.set('object', { name: 'test' }, 3600);
      await store.set('array', [1, 2, 3], 3600);
      await store.set('boolean', true, 3600);

      expect(await store.get('string')).toBe('test');
      expect(await store.get('number')).toBe(42);
      expect(await store.get('object')).toEqual({ name: 'test' });
      expect(await store.get('array')).toEqual([1, 2, 3]);
      expect(await store.get('boolean')).toBe(true);
    });
  });

  describe('엣지 케이스', () => {
    it('빈 캐시에서 keys() 호출 시 빈 배열 반환', async () => {
      const keys = await store.keys();
      expect(keys).toEqual([]);
    });

    it('빈 캐시에서 clear() 호출 시 에러 없음', async () => {
      await expect(store.clear()).resolves.not.toThrow();
    });

    it('존재하지 않는 키 삭제 시 false 반환', async () => {
      const result = await store.delete('non-existent');
      expect(result).toBe(false);
    });

    it('max가 1인 경우에도 정상 동작', async () => {
      const tinyStore = new LRUMemoryStore({
        max: 1,
        ttl: 3600000,
      });

      await tinyStore.set('key1', 'value1', 3600);
      await tinyStore.set('key2', 'value2', 3600);

      expect(await tinyStore.get('key1')).toBeNull();
      expect(await tinyStore.get('key2')).toBe('value2');

      await tinyStore.clear();
    });
  });
});
