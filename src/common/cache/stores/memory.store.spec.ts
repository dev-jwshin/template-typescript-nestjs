import { MemoryStore } from './memory.store';

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore({
      cleanupInterval: 100, // 100ms로 테스트 간격 단축
      maxItems: 5, // 테스트를 위해 작은 값 사용
    });
  });

  afterEach(async () => {
    await store.clear();
    // cleanup timer 정리
    (store as any).stopCleanupScheduler?.();
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

    it('delete() - 존재하지 않는 키 삭제 시 false 반환', async () => {
      const deleted = await store.delete('non-existent-key');
      expect(deleted).toBe(false);
    });

    it('clear() - 모든 값을 삭제해야 함', async () => {
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);

      await store.clear();

      const result1 = await store.get('key1');
      const result2 = await store.get('key2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
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

  describe('TTL 관리', () => {
    it('만료된 항목은 null을 반환해야 함', async () => {
      const key = 'test-key';
      const ttl = 0.1; // 100ms

      await store.set(key, 'value', ttl);

      // 200ms 대기 (TTL보다 긴 시간)
      await new Promise((resolve) => setTimeout(resolve, 200));

      const result = await store.get(key);
      expect(result).toBeNull();
    });

    it('만료되지 않은 항목은 값을 반환해야 함', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 10; // 10초

      await store.set(key, value, ttl);

      const result = await store.get(key);
      expect(result).toBe(value);
    });

    it('TTL이 매우 긴 항목은 만료되지 않아야 함', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await store.set(key, value, 86400); // 1일 TTL

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await store.get(key);
      expect(result).toBe(value);
    });
  });

  describe('자동 정리 (Cleanup Scheduler)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('만료된 항목을 자동으로 정리해야 함', async () => {
      const key1 = 'expire-key';
      const key2 = 'valid-key';

      await store.set(key1, 'value1', 0.05); // 50ms 후 만료
      await store.set(key2, 'value2', 10); // 10초 후 만료

      // 시간을 200ms 앞으로 이동
      jest.advanceTimersByTime(200);

      const result1 = await store.get(key1);
      const result2 = await store.get(key2);

      expect(result1).toBeNull(); // 만료되어 삭제됨
      expect(result2).toBe('value2'); // 여전히 유효함
    });

    it('cleanup() 메서드가 만료된 항목 수를 반환해야 함', async () => {
      // 매우 짧은 TTL 사용
      await store.set('cleanup-key1', 'value1', 0.02); // 20ms TTL
      await store.set('cleanup-key2', 'value2', 0.02); // 20ms TTL
      await store.set('cleanup-key3', 'value3', 10);   // 10초 TTL

      // 시간을 200ms 앞으로 이동
      jest.advanceTimersByTime(200);

      const cleaned = (store as any).cleanup();

      expect(cleaned).toBe(2); // 2개 항목이 정리됨

      // 정리 후 key3만 남아있는지 확인
      expect(await store.get('cleanup-key1')).toBeNull();
      expect(await store.get('cleanup-key2')).toBeNull();
      expect(await store.get('cleanup-key3')).toBe('value3');
    });
  });

  describe('최대 항목 수 제한 (Max Items)', () => {
    it('최대 항목 수를 초과하면 가장 오래된 항목을 삭제해야 함', async () => {
      // maxItems = 5로 설정되어 있음
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);
      await store.set('key3', 'value3', 3600);
      await store.set('key4', 'value4', 3600);
      await store.set('key5', 'value5', 3600);

      // 6번째 항목 추가 (key1이 삭제되어야 함)
      await store.set('key6', 'value6', 3600);

      const result1 = await store.get('key1');
      const result6 = await store.get('key6');

      expect(result1).toBeNull(); // 가장 오래된 항목 삭제됨
      expect(result6).toBe('value6'); // 새 항목 존재함
    });

    it('FIFO 순서로 항목을 삭제해야 함', async () => {
      // maxItems = 5
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);
      await store.set('key3', 'value3', 3600);
      await store.set('key4', 'value4', 3600);
      await store.set('key5', 'value5', 3600);

      // 2개 추가 (key1, key2가 삭제되어야 함)
      await store.set('key6', 'value6', 3600);
      await store.set('key7', 'value7', 3600);

      expect(await store.get('key1')).toBeNull();
      expect(await store.get('key2')).toBeNull();
      expect(await store.get('key3')).toBe('value3');
      expect(await store.get('key7')).toBe('value7');
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

    it('deletePattern() - 패턴에 맞는 항목이 없으면 0 반환', async () => {
      await store.set('key1', 'value1', 3600);
      await store.set('key2', 'value2', 3600);

      const deleted = await store.deletePattern('^nonexistent:');

      expect(deleted).toBe(0);
    });

    it('deletePattern() - 복잡한 정규식 패턴 지원', async () => {
      await store.set('cache:user:1', 'user1', 3600);
      await store.set('cache:user:2', 'user2', 3600);
      await store.set('cache:post:1', 'post1', 3600);
      await store.set('session:abc', 'session', 3600);

      const deleted = await store.deletePattern('^cache:(user|post):');

      expect(deleted).toBe(3);
      expect(await store.get('session:abc')).toBe('session');
    });
  });

  describe('데이터 타입', () => {
    it('문자열을 저장하고 가져와야 함', async () => {
      await store.set('string', 'test', 3600);
      expect(await store.get('string')).toBe('test');
    });

    it('숫자를 저장하고 가져와야 함', async () => {
      await store.set('number', 42, 3600);
      expect(await store.get('number')).toBe(42);
    });

    it('객체를 저장하고 가져와야 함', async () => {
      const obj = { name: 'test', value: 123 };
      await store.set('object', obj, 3600);
      expect(await store.get('object')).toEqual(obj);
    });

    it('배열을 저장하고 가져와야 함', async () => {
      const arr = [1, 2, 3, 'test'];
      await store.set('array', arr, 3600);
      expect(await store.get('array')).toEqual(arr);
    });

    it('null을 저장하고 가져와야 함', async () => {
      await store.set('null', null, 3600);
      expect(await store.get('null')).toBeNull();
    });

    it('boolean을 저장하고 가져와야 함', async () => {
      await store.set('bool-true', true, 3600);
      await store.set('bool-false', false, 3600);

      expect(await store.get('bool-true')).toBe(true);
      expect(await store.get('bool-false')).toBe(false);
    });
  });

  describe('동시성', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('동시 set 작업을 처리해야 함', async () => {
      // 충분히 긴 TTL 사용 (자동 cleanup에 영향받지 않도록)
      const longTTL = 3600;

      // maxItems가 5개이므로 5개만 테스트
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(store.set(`concurrent-key${i}`, `value${i}`, longTTL));
      }

      await Promise.all(promises);

      // 각 키를 순차적으로 검증
      for (let i = 0; i < 5; i++) {
        const value = await store.get(`concurrent-key${i}`);
        expect(value).toBe(`value${i}`);
      }
    });

    it('동시 get 작업을 처리해야 함', async () => {
      await store.set('shared-key', 'shared-value', 3600);

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(store.get('shared-key'));
      }

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBe('shared-value');
      });
    });
  });
});
