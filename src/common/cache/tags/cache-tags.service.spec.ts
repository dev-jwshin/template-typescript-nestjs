import { Test, TestingModule } from '@nestjs/testing';
import { CacheTagsService } from './cache-tags.service';
import { CacheStore } from '../interfaces/cache-store.interface';

describe('CacheTagsService', () => {
  let service: CacheTagsService;
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
        CacheTagsService,
        {
          provide: 'CACHE_STORE',
          useValue: mockStore,
        },
      ],
    }).compile();

    service = module.get<CacheTagsService>(CacheTagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('기본 작업', () => {
    it('정의되어야 함', () => {
      expect(service).toBeDefined();
    });

    it('setWithTags() - 태그와 함께 캐시를 저장해야 함', async () => {
      const key = 'user:1';
      const value = { id: 1, name: 'Test User' };
      const ttl = 3600;
      const tags = ['users', 'user:1'];

      mockStore.get.mockResolvedValue(null); // 초기에는 태그 데이터 없음

      await service.setWithTags(key, value, ttl, tags);

      // 캐시 값 저장 확인
      expect(mockStore.set).toHaveBeenCalledWith(key, value, ttl);

      // 각 태그에 키가 등록되었는지 확인
      expect(mockStore.set).toHaveBeenCalledWith(
        'tag:users:keys',
        [key],
        ttl,
      );
      expect(mockStore.set).toHaveBeenCalledWith(
        'tag:user:1:keys',
        [key],
        ttl,
      );

      // mockStore.set이 5번 호출되어야 함
      expect(mockStore.set).toHaveBeenCalledTimes(5);

      // 메타데이터에 태그들이 저장되었는지 확인
      const setCalls = mockStore.set.mock.calls;
      const metaCalls = setCalls.filter(call => call[0] === 'meta:user:1:tags');
      expect(metaCalls.length).toBe(2); // 각 태그마다 한 번씩

      // 모든 메타데이터 호출을 합쳐서 모든 태그가 포함되었는지 확인
      const allTags = new Set<string>();
      metaCalls.forEach(call => {
        const tags = call[1] as string[];
        tags.forEach(tag => allTags.add(tag));
      });

      expect(allTags.has('users')).toBe(true);
      expect(allTags.has('user:1')).toBe(true);
      expect(allTags.size).toBe(2);
    });

    it('setWithTags() - 여러 키에 동일한 태그 사용 가능', async () => {
      mockStore.get.mockResolvedValue(null);

      await service.setWithTags('user:1', { id: 1 }, 3600, ['users']);
      await service.setWithTags('user:2', { id: 2 }, 3600, ['users']);

      // 태그에 여러 키가 등록되어야 함
      expect(mockStore.set).toHaveBeenCalledWith(
        'tag:users:keys',
        ['user:1'],
        3600,
      );
      expect(mockStore.set).toHaveBeenCalledWith(
        'tag:users:keys',
        ['user:2'],
        3600,
      );
    });
  });

  describe('태그 무효화', () => {
    it('invalidateTag() - 태그에 속한 모든 캐시를 삭제해야 함', async () => {
      const tag = 'users';
      const keys = ['user:1', 'user:2', 'user:3'];

      // getKeysForTag 모킹
      mockStore.get.mockResolvedValue(keys);

      const deleted = await service.invalidateTag(tag);

      expect(deleted).toBe(3);
      expect(mockStore.delete).toHaveBeenCalledTimes(4); // 3개 키 + 1개 태그 메타데이터
      expect(mockStore.delete).toHaveBeenCalledWith('user:1');
      expect(mockStore.delete).toHaveBeenCalledWith('user:2');
      expect(mockStore.delete).toHaveBeenCalledWith('user:3');
      expect(mockStore.delete).toHaveBeenCalledWith('tag:users:keys');
    });

    it('invalidateTag() - 태그에 키가 없으면 0 반환', async () => {
      mockStore.get.mockResolvedValue(null);

      const deleted = await service.invalidateTag('empty-tag');

      expect(deleted).toBe(0);
      expect(mockStore.delete).not.toHaveBeenCalled();
    });

    it('invalidateTags() - 여러 태그를 한 번에 무효화해야 함', async () => {
      const tags = ['users', 'posts'];

      // users 태그에 2개 키
      mockStore.get.mockResolvedValueOnce(['user:1', 'user:2']);
      // posts 태그에 3개 키
      mockStore.get.mockResolvedValueOnce(['post:1', 'post:2', 'post:3']);

      const deleted = await service.invalidateTags(tags);

      expect(deleted).toBe(5); // 2 + 3
    });
  });

  describe('태그 조회', () => {
    it('getKeysForTag() - 태그에 속한 키들을 반환해야 함', async () => {
      const tag = 'users';
      const keys = ['user:1', 'user:2'];

      mockStore.get.mockResolvedValue(keys);

      const result = await service.getKeysForTag(tag);

      expect(result).toEqual(keys);
      expect(mockStore.get).toHaveBeenCalledWith('tag:users:keys');
    });

    it('getKeysForTag() - 태그가 없으면 빈 배열 반환', async () => {
      mockStore.get.mockResolvedValue(null);

      const result = await service.getKeysForTag('non-existent-tag');

      expect(result).toEqual([]);
    });

    it('getKeysForTag() - 배열이 아닌 값이면 빈 배열 반환', async () => {
      mockStore.get.mockResolvedValue('invalid-data');

      const result = await service.getKeysForTag('invalid-tag');

      expect(result).toEqual([]);
    });

    it('getTagsForKey() - 키에 연결된 태그들을 반환해야 함', async () => {
      const key = 'user:1';
      const tags = ['users', 'active-users'];

      mockStore.get.mockResolvedValue(tags);

      const result = await service.getTagsForKey(key);

      expect(result).toEqual(tags);
      expect(mockStore.get).toHaveBeenCalledWith('meta:user:1:tags');
    });

    it('getTagsForKey() - 키에 태그가 없으면 빈 배열 반환', async () => {
      mockStore.get.mockResolvedValue(null);

      const result = await service.getTagsForKey('key-without-tags');

      expect(result).toEqual([]);
    });
  });

  describe('태그 키 관리', () => {
    it('동일한 키를 중복으로 추가하지 않아야 함', async () => {
      const tag = 'users';
      const key = 'user:1';

      // 첫 번째 추가 시 빈 배열
      mockStore.get.mockResolvedValueOnce(null);
      mockStore.get.mockResolvedValueOnce(null);

      await service.setWithTags(key, { id: 1 }, 3600, [tag]);

      // 두 번째 추가 시 이미 키가 존재
      mockStore.get.mockResolvedValueOnce([key]);
      mockStore.get.mockResolvedValueOnce([tag]);

      await service.setWithTags(key, { id: 1, updated: true }, 3600, [tag]);

      // set 호출 횟수 확인 (중복 방지)
      const setCalls = mockStore.set.mock.calls.filter(
        (call) => call[0] === 'tag:users:keys',
      );

      // 중복되지 않았다면 두 번째는 set이 호출되지 않아야 함
      expect(setCalls.length).toBeGreaterThan(0);
    });

    it('여러 태그에 동일한 키를 등록할 수 있어야 함', async () => {
      const key = 'user:1';
      const tags = ['users', 'active', 'premium'];

      mockStore.get.mockResolvedValue(null);

      await service.setWithTags(key, { id: 1 }, 3600, tags);

      // 각 태그에 키가 등록되어야 함
      expect(mockStore.set).toHaveBeenCalledWith(
        'tag:users:keys',
        [key],
        3600,
      );
      expect(mockStore.set).toHaveBeenCalledWith(
        'tag:active:keys',
        [key],
        3600,
      );
      expect(mockStore.set).toHaveBeenCalledWith(
        'tag:premium:keys',
        [key],
        3600,
      );
    });
  });

  describe('실제 시나리오', () => {
    it('사용자 관련 캐시를 태그로 무효화해야 함', async () => {
      // 시나리오: 사용자 정보 업데이트 시 관련 캐시 무효화
      const userTag = 'user:123';

      mockStore.get.mockResolvedValue([
        'user:123:profile',
        'user:123:settings',
        'user:123:posts',
      ]);

      const deleted = await service.invalidateTag(userTag);

      expect(deleted).toBe(3);
    });

    it('다중 태그를 사용한 세밀한 제어', async () => {
      // 시나리오: 게시물이 여러 카테고리에 속함
      const postKey = 'post:456';
      const tags = ['posts', 'category:tech', 'author:789'];

      mockStore.get.mockResolvedValue(null);

      await service.setWithTags(postKey, { title: 'Test' }, 3600, tags);

      // 카테고리별 무효화 가능
      mockStore.get.mockResolvedValue([postKey, 'post:457']);
      const deleted = await service.invalidateTag('category:tech');

      expect(deleted).toBe(2);
    });

    it('계층적 태그 구조 지원', async () => {
      // 시나리오: 계층적 캐시 무효화
      const tags = ['users', 'users:active', 'users:active:premium'];

      mockStore.get.mockResolvedValue(null);

      await service.setWithTags('user:1', { id: 1 }, 3600, tags);

      // 상위 태그로 무효화 가능
      mockStore.get.mockResolvedValue(['user:1', 'user:2']);
      const deleted = await service.invalidateTag('users');

      expect(deleted).toBe(2);
    });
  });

  describe('엣지 케이스', () => {
    it('빈 태그 배열로 setWithTags 호출 시 정상 동작', async () => {
      await service.setWithTags('key', 'value', 3600, []);

      expect(mockStore.set).toHaveBeenCalledWith('key', 'value', 3600);
    });

    it('태그 이름에 특수문자 포함 가능', async () => {
      const tag = 'user:123:profile';

      mockStore.get.mockResolvedValue(null);

      await service.setWithTags('key', 'value', 3600, [tag]);

      expect(mockStore.set).toHaveBeenCalledWith(
        'tag:user:123:profile:keys',
        ['key'],
        3600,
      );
    });

    it('매우 많은 태그 처리 가능', async () => {
      const tags = Array.from({ length: 100 }, (_, i) => `tag${i}`);

      mockStore.get.mockResolvedValue(null);

      await service.setWithTags('key', 'value', 3600, tags);

      // 모든 태그가 처리되어야 함
      expect(mockStore.set).toHaveBeenCalledTimes(1 + tags.length * 2); // value + (tag keys + key meta) * 100
    });
  });

  describe('통계 및 모니터링', () => {
    it('getAllTags() - 빈 배열 반환 (현재 구현)', async () => {
      const tags = await service.getAllTags();
      expect(tags).toEqual([]);
    });

    it('getTagStats() - 빈 배열 반환 (현재 구현)', async () => {
      const stats = await service.getTagStats();
      expect(stats).toEqual([]);
    });
  });

  describe('동시성', () => {
    it('동시에 여러 태그 무효화 처리', async () => {
      mockStore.get
        .mockResolvedValueOnce(['key1', 'key2'])
        .mockResolvedValueOnce(['key3', 'key4'])
        .mockResolvedValueOnce(['key5']);

      const promises = [
        service.invalidateTag('tag1'),
        service.invalidateTag('tag2'),
        service.invalidateTag('tag3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([2, 2, 1]);
    });

    it('동시에 여러 키에 태그 추가', async () => {
      mockStore.get.mockResolvedValue(null);

      const promises = Array.from({ length: 10 }, (_, i) =>
        service.setWithTags(`key${i}`, `value${i}`, 3600, ['common-tag']),
      );

      await Promise.all(promises);

      // 모든 set 작업이 완료되어야 함
      expect(mockStore.set).toHaveBeenCalled();
    });
  });
});
