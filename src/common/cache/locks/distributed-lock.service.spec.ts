import { Test, TestingModule } from '@nestjs/testing';
import { DistributedLockService } from './distributed-lock.service';
import { CacheStore } from '../interfaces/cache-store.interface';

describe('DistributedLockService', () => {
  let service: DistributedLockService;
  let mockStore: jest.Mocked<CacheStore>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedLockService,
        {
          provide: 'CACHE_STORE',
          useValue: mockStore,
        },
      ],
    }).compile();

    service = module.get<DistributedLockService>(DistributedLockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('기본 작업', () => {
    it('정의되어야 함', () => {
      expect(service).toBeDefined();
    });
  });

  describe('락 획득 (acquire)', () => {
    it('락이 없으면 성공적으로 획득해야 함', async () => {
      const key = 'test-lock';
      mockStore.get.mockResolvedValue(null); // 락 없음

      const lockId = await service.acquire(key, 10);

      expect(lockId).toBeTruthy();
      expect(typeof lockId).toBe('string');
      expect(mockStore.get).toHaveBeenCalledWith('lock:test-lock');
      expect(mockStore.set).toHaveBeenCalledWith('lock:test-lock', lockId, 10);
    });

    it('락이 이미 존재하면 재시도 후 null 반환', async () => {
      const key = 'test-lock';
      mockStore.get.mockResolvedValue('existing-lock-id'); // 이미 락 존재

      const lockId = await service.acquire(key, 10, 2); // 2회 재시도

      expect(lockId).toBeNull();
      expect(mockStore.get).toHaveBeenCalledTimes(2); // 2회 재시도
      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it('재시도 중 락을 획득할 수 있으면 성공', async () => {
      const key = 'test-lock';

      // 첫 번째 시도: 락 존재
      // 두 번째 시도: 락 해제됨
      mockStore.get
        .mockResolvedValueOnce('existing-lock')
        .mockResolvedValueOnce(null);

      const lockId = await service.acquire(key, 10, 3);

      expect(lockId).toBeTruthy();
      expect(mockStore.get).toHaveBeenCalledTimes(2);
      expect(mockStore.set).toHaveBeenCalledWith('lock:test-lock', lockId, 10);
    });

    it('기본 TTL과 재시도 횟수를 사용해야 함', async () => {
      const key = 'test-lock';
      mockStore.get.mockResolvedValue(null);

      const lockId = await service.acquire(key);

      expect(lockId).toBeTruthy();
      expect(mockStore.set).toHaveBeenCalledWith(
        'lock:test-lock',
        lockId,
        10, // 기본 TTL
      );
    });
  });

  describe('락 해제 (release)', () => {
    it('올바른 lockId로 락을 해제해야 함', async () => {
      const key = 'test-lock';
      const lockId = 'test-lock-id';

      mockStore.get.mockResolvedValue(lockId); // 현재 락 ID
      mockStore.delete.mockResolvedValue(true);

      const result = await service.release(key, lockId);

      expect(result).toBe(true);
      expect(mockStore.get).toHaveBeenCalledWith('lock:test-lock');
      expect(mockStore.delete).toHaveBeenCalledWith('lock:test-lock');
    });

    it('잘못된 lockId로는 락을 해제할 수 없어야 함', async () => {
      const key = 'test-lock';
      const correctLockId = 'correct-id';
      const wrongLockId = 'wrong-id';

      mockStore.get.mockResolvedValue(correctLockId);

      const result = await service.release(key, wrongLockId);

      expect(result).toBe(false);
      expect(mockStore.delete).not.toHaveBeenCalled();
    });

    it('락이 없으면 false 반환', async () => {
      const key = 'test-lock';
      const lockId = 'test-lock-id';

      mockStore.get.mockResolvedValue(null); // 락 없음

      const result = await service.release(key, lockId);

      expect(result).toBe(false);
      expect(mockStore.delete).not.toHaveBeenCalled();
    });
  });

  describe('락 보호 실행 (withLock)', () => {
    it('락을 획득하고 콜백을 실행한 후 자동으로 해제해야 함', async () => {
      const key = 'test-lock';
      const callback = jest.fn().mockResolvedValue('result');

      let capturedLockId: string;

      // acquire 시 락 없음
      mockStore.get.mockResolvedValueOnce(null);

      // set 호출 시 lockId 캡처
      mockStore.set.mockImplementation(async (_key: string, value: any) => {
        capturedLockId = value;
      });

      // release 시 같은 lockId 반환
      mockStore.get.mockImplementation(async () => capturedLockId);

      mockStore.delete.mockResolvedValue(true);

      const result = await service.withLock(key, callback, 10);

      expect(result).toBe('result');
      expect(callback).toHaveBeenCalled();
      expect(mockStore.delete).toHaveBeenCalled();
    });

    it('락을 획득하지 못하면 에러를 throw해야 함', async () => {
      const key = 'test-lock';
      const callback = jest.fn();

      mockStore.get.mockResolvedValue('existing-lock'); // 항상 락 존재

      await expect(service.withLock(key, callback, 10, 2)).rejects.toThrow(
        '락 획득 실패',
      );

      expect(callback).not.toHaveBeenCalled();
    });

    it('콜백에서 에러가 발생해도 락을 해제해야 함', async () => {
      const key = 'test-lock';
      const error = new Error('Callback error');
      const callback = jest.fn().mockRejectedValue(error);

      let capturedLockId: string;

      // acquire 시 락 없음
      mockStore.get.mockResolvedValueOnce(null);

      // set 호출 시 lockId 캡처
      mockStore.set.mockImplementation(async (_key: string, value: any) => {
        capturedLockId = value;
      });

      // release 시 같은 lockId 반환
      mockStore.get.mockImplementation(async () => capturedLockId);

      mockStore.delete.mockResolvedValue(true);

      await expect(service.withLock(key, callback, 10)).rejects.toThrow(error);

      expect(callback).toHaveBeenCalled();
      expect(mockStore.delete).toHaveBeenCalled(); // finally 블록에서 해제
    });

    it('콜백 반환값을 그대로 전달해야 함', async () => {
      const key = 'test-lock';
      const expectedResult = { data: 'test', count: 42 };
      const callback = jest.fn().mockResolvedValue(expectedResult);

      mockStore.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('lock-id');

      mockStore.delete.mockResolvedValue(true);

      const result = await service.withLock(key, callback, 10);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('락 상태 확인', () => {
    it('isLocked() - 락이 존재하면 true 반환', async () => {
      const key = 'test-lock';
      mockStore.get.mockResolvedValue('lock-id');

      const result = await service.isLocked(key);

      expect(result).toBe(true);
      expect(mockStore.get).toHaveBeenCalledWith('lock:test-lock');
    });

    it('isLocked() - 락이 없으면 false 반환', async () => {
      const key = 'test-lock';
      mockStore.get.mockResolvedValue(null);

      const result = await service.isLocked(key);

      expect(result).toBe(false);
    });

    it('getLockInfo() - 락 정보를 반환해야 함', async () => {
      const key = 'test-lock';
      const lockId = 'test-lock-id';

      mockStore.get.mockResolvedValue(lockId);

      const info = await service.getLockInfo(key);

      expect(info).toEqual({
        locked: true,
        lockId: lockId,
      });
    });

    it('getLockInfo() - 락이 없으면 locked: false 반환', async () => {
      const key = 'test-lock';
      mockStore.get.mockResolvedValue(null);

      const info = await service.getLockInfo(key);

      expect(info).toEqual({
        locked: false,
        lockId: undefined,
      });
    });
  });

  describe('락 TTL 연장 (extend)', () => {
    it('올바른 lockId로 TTL을 연장해야 함', async () => {
      const key = 'test-lock';
      const lockId = 'test-lock-id';
      const newTTL = 20;

      mockStore.get.mockResolvedValue(lockId);

      const result = await service.extend(key, lockId, newTTL);

      expect(result).toBe(true);
      expect(mockStore.set).toHaveBeenCalledWith('lock:test-lock', lockId, newTTL);
    });

    it('잘못된 lockId로는 TTL을 연장할 수 없어야 함', async () => {
      const key = 'test-lock';
      const correctLockId = 'correct-id';
      const wrongLockId = 'wrong-id';

      mockStore.get.mockResolvedValue(correctLockId);

      const result = await service.extend(key, wrongLockId, 20);

      expect(result).toBe(false);
      expect(mockStore.set).not.toHaveBeenCalled();
    });
  });

  describe('강제 락 해제 (forceRelease)', () => {
    it('소유자 확인 없이 락을 강제로 해제해야 함', async () => {
      const key = 'test-lock';

      await service.forceRelease(key);

      expect(mockStore.delete).toHaveBeenCalledWith('lock:test-lock');
    });
  });

  describe('동시성 시나리오', () => {
    it('여러 클라이언트가 동시에 락을 획득하려 할 때 하나만 성공', async () => {
      const key = 'test-lock';

      // 첫 번째 클라이언트가 락 획득 성공
      mockStore.get
        .mockResolvedValueOnce(null) // client1 첫 시도 성공
        .mockResolvedValueOnce('lock-id-1') // client2 첫 시도 실패
        .mockResolvedValueOnce('lock-id-1') // client2 두 번째 시도 실패
        .mockResolvedValueOnce('lock-id-1'); // client2 세 번째 시도 실패

      const lockId1 = await service.acquire(key, 10, 1);
      const lockId2 = await service.acquire(key, 10, 3);

      expect(lockId1).toBeTruthy();
      expect(lockId2).toBeNull();
    });

    it('락이 해제된 후 다른 클라이언트가 획득 가능', async () => {
      const key = 'test-lock';

      // 첫 번째 클라이언트 획득 및 해제
      mockStore.get
        .mockResolvedValueOnce(null) // acquire
        .mockResolvedValueOnce('lock-id-1'); // release 시 확인

      mockStore.delete.mockResolvedValue(true);

      const lockId1 = await service.acquire(key, 10);
      await service.release(key, lockId1!);

      // 두 번째 클라이언트 획득
      mockStore.get.mockResolvedValueOnce(null);

      const lockId2 = await service.acquire(key, 10);

      expect(lockId2).toBeTruthy();
      expect(lockId2).not.toBe(lockId1);
    });
  });

  describe('실제 시나리오', () => {
    it('주문 처리 시나리오 - 중복 주문 방지', async () => {
      const orderId = 'order-123';
      const processOrder = jest.fn().mockResolvedValue({ success: true });

      mockStore.get
        .mockResolvedValueOnce(null) // acquire
        .mockResolvedValueOnce('lock-id'); // release

      mockStore.delete.mockResolvedValue(true);

      const result = await service.withLock(
        `order:${orderId}`,
        processOrder,
        30,
      );

      expect(result).toEqual({ success: true });
      expect(processOrder).toHaveBeenCalledTimes(1);
    });

    it('재고 업데이트 시나리오 - 동시성 제어', async () => {
      const productId = 'product-456';
      const updateInventory = jest.fn().mockResolvedValue({ stock: 95 });

      mockStore.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('lock-id');

      mockStore.delete.mockResolvedValue(true);

      const result = await service.withLock(
        `inventory:${productId}`,
        updateInventory,
        10,
      );

      expect(result).toEqual({ stock: 95 });
    });

    it('캐시 갱신 시나리오 - 중복 갱신 방지', async () => {
      const cacheKey = 'expensive-data';
      const fetchData = jest.fn().mockResolvedValue({ data: 'fetched' });

      mockStore.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('lock-id');

      mockStore.delete.mockResolvedValue(true);

      const result = await service.withLock(
        `refresh:${cacheKey}`,
        fetchData,
        60,
      );

      expect(result).toEqual({ data: 'fetched' });
      expect(fetchData).toHaveBeenCalledTimes(1);
    });
  });

  describe('엣지 케이스', () => {
    it('TTL이 0이어도 정상 동작', async () => {
      const key = 'test-lock';
      mockStore.get.mockResolvedValue(null);

      const lockId = await service.acquire(key, 0);

      expect(lockId).toBeTruthy();
      expect(mockStore.set).toHaveBeenCalledWith('lock:test-lock', lockId, 0);
    });

    it('매우 긴 TTL도 처리 가능', async () => {
      const key = 'test-lock';
      const longTTL = 86400; // 1일

      mockStore.get.mockResolvedValue(null);

      const lockId = await service.acquire(key, longTTL);

      expect(lockId).toBeTruthy();
      expect(mockStore.set).toHaveBeenCalledWith(
        'lock:test-lock',
        lockId,
        longTTL,
      );
    });

    it('재시도 횟수가 0이면 한 번만 시도', async () => {
      const key = 'test-lock';
      mockStore.get.mockResolvedValue('existing-lock');

      const lockId = await service.acquire(key, 10, 0);

      expect(lockId).toBeNull();
      expect(mockStore.get).toHaveBeenCalledTimes(0); // 0번 재시도
    });

    it('재시도 횟수가 1이면 한 번 시도', async () => {
      const key = 'test-lock';
      mockStore.get.mockResolvedValue('existing-lock');

      const lockId = await service.acquire(key, 10, 1);

      expect(lockId).toBeNull();
      expect(mockStore.get).toHaveBeenCalledTimes(1);
    });
  });
});
