import { Cacheable, CacheInvalidate } from './cacheable.decorator';

// 테스트용 Mock CacheService
class MockCacheService {
  private cache = new Map<string, any>();

  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>,
  ): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const value = await callback();
    this.cache.set(key, value);
    return value;
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

describe('Cacheable Decorator', () => {
  let mockCacheService: MockCacheService;

  beforeEach(() => {
    mockCacheService = new MockCacheService();
  });

  afterEach(() => {
    mockCacheService.clear();
  });

  describe('@Cacheable', () => {
    it('메서드 결과를 캐싱해야 함', async () => {
      class TestService {
        cache = mockCacheService;
        callCount = 0;

        @Cacheable({ key: 'test-key', ttl: 3600 })
        async getData(): Promise<string> {
          this.callCount++;
          return 'test-data';
        }
      }

      const service = new TestService();

      const result1 = await service.getData();
      const result2 = await service.getData();

      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
      expect(service.callCount).toBe(1); // 한 번만 호출됨
    });

    it('동적 키 생성 함수를 사용해야 함', async () => {
      class TestService {
        cache = mockCacheService;
        callCount = 0;

        @Cacheable({ key: (id: number) => `user:${id}`, ttl: 3600 })
        async getUser(id: number): Promise<{ id: number; name: string }> {
          this.callCount++;
          return { id, name: `User ${id}` };
        }
      }

      const service = new TestService();

      const user1_call1 = await service.getUser(1);
      const user1_call2 = await service.getUser(1);
      const user2_call1 = await service.getUser(2);

      expect(user1_call1).toEqual({ id: 1, name: 'User 1' });
      expect(user1_call2).toEqual({ id: 1, name: 'User 1' });
      expect(user2_call1).toEqual({ id: 2, name: 'User 2' });
      expect(service.callCount).toBe(2); // user:1 한 번, user:2 한 번
    });

    it('여러 인자를 받는 동적 키를 생성해야 함', async () => {
      class TestService {
        cache = mockCacheService;
        callCount = 0;

        @Cacheable({
          key: (userId: number, postId: number) => `post:${userId}:${postId}`,
          ttl: 3600,
        })
        async getPost(
          userId: number,
          postId: number,
        ): Promise<{ userId: number; postId: number }> {
          this.callCount++;
          return { userId, postId };
        }
      }

      const service = new TestService();

      await service.getPost(1, 100);
      await service.getPost(1, 100); // 캐시 히트
      await service.getPost(1, 101); // 다른 키
      await service.getPost(2, 100); // 다른 키

      expect(service.callCount).toBe(3);
    });

    it('기본 TTL 3600초를 사용해야 함', async () => {
      class TestService {
        cache = mockCacheService;
        rememberedTTL: number | undefined;

        @Cacheable({ key: 'test-key' })
        async getData(): Promise<string> {
          return 'data';
        }
      }

      const service = new TestService();

      // remember 메서드를 스파이하여 TTL 확인
      const rememberSpy = jest.spyOn(mockCacheService, 'remember');

      await service.getData();

      expect(rememberSpy).toHaveBeenCalledWith(
        'test-key',
        3600,
        expect.any(Function),
      );
    });

    it('사용자 정의 TTL을 사용해야 함', async () => {
      class TestService {
        cache = mockCacheService;

        @Cacheable({ key: 'test-key', ttl: 7200 })
        async getData(): Promise<string> {
          return 'data';
        }
      }

      const service = new TestService();
      const rememberSpy = jest.spyOn(mockCacheService, 'remember');

      await service.getData();

      expect(rememberSpy).toHaveBeenCalledWith(
        'test-key',
        7200,
        expect.any(Function),
      );
    });

    it('CacheService가 없으면 원본 메서드를 직접 호출해야 함', async () => {
      class TestService {
        // cache 속성이 없음
        callCount = 0;

        @Cacheable({ key: 'test-key', ttl: 3600 })
        async getData(): Promise<string> {
          this.callCount++;
          return 'data';
        }
      }

      const service = new TestService();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result1 = await service.getData();
      const result2 = await service.getData();

      expect(result1).toBe('data');
      expect(result2).toBe('data');
      expect(service.callCount).toBe(2); // 캐싱 없이 매번 호출됨
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('비동기 메서드의 반환값을 올바르게 처리해야 함', async () => {
      class TestService {
        cache = mockCacheService;

        @Cacheable({ key: 'async-data', ttl: 3600 })
        async getAsyncData(): Promise<{ value: number }> {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { value: 42 };
        }
      }

      const service = new TestService();

      const result = await service.getAsyncData();

      expect(result).toEqual({ value: 42 });
    });

    it('에러를 정상적으로 전파해야 함', async () => {
      class TestService {
        cache = mockCacheService;

        @Cacheable({ key: 'error-key', ttl: 3600 })
        async getDataWithError(): Promise<string> {
          throw new Error('Test error');
        }
      }

      const service = new TestService();

      await expect(service.getDataWithError()).rejects.toThrow('Test error');
    });
  });

  describe('@CacheInvalidate', () => {
    it('메서드 실행 후 캐시를 무효화해야 함', async () => {
      class TestService {
        cache = mockCacheService;
        getValue_callCount = 0;

        @Cacheable({ key: 'user:1', ttl: 3600 })
        async getValue(): Promise<string> {
          this.getValue_callCount++;
          return 'value';
        }

        @CacheInvalidate({ key: 'user:1' })
        async updateValue(): Promise<void> {
          // 업데이트 로직
        }
      }

      const service = new TestService();

      // 첫 번째 호출
      await service.getValue();
      expect(service.getValue_callCount).toBe(1);

      // 두 번째 호출 (캐시됨)
      await service.getValue();
      expect(service.getValue_callCount).toBe(1);

      // 캐시 무효화
      await service.updateValue();

      // 세 번째 호출 (캐시가 무효화되어 다시 호출됨)
      await service.getValue();
      expect(service.getValue_callCount).toBe(2);
    });

    it('동적 키로 캐시를 무효화해야 함', async () => {
      class TestService {
        cache = mockCacheService;

        @CacheInvalidate({ key: (id: number) => `user:${id}` })
        async updateUser(id: number): Promise<void> {
          // 업데이트 로직
        }
      }

      const service = new TestService();

      // 캐시에 데이터 추가
      await mockCacheService.remember('user:1', 3600, async () => 'data');
      expect(mockCacheService.has('user:1')).toBe(true);

      // 무효화
      await service.updateUser(1);

      expect(mockCacheService.has('user:1')).toBe(false);
    });

    it('메서드의 반환값을 유지해야 함', async () => {
      class TestService {
        cache = mockCacheService;

        @CacheInvalidate({ key: 'test-key' })
        async updateData(): Promise<{ success: boolean }> {
          return { success: true };
        }
      }

      const service = new TestService();

      const result = await service.updateData();

      expect(result).toEqual({ success: true });
    });

    it('CacheService가 없어도 메서드를 정상 실행해야 함', async () => {
      class TestService {
        // cache 속성이 없음

        @CacheInvalidate({ key: 'test-key' })
        async updateData(): Promise<string> {
          return 'updated';
        }
      }

      const service = new TestService();

      const result = await service.updateData();

      expect(result).toBe('updated');
    });

    it('에러를 정상적으로 전파해야 함', async () => {
      class TestService {
        cache = mockCacheService;

        @CacheInvalidate({ key: 'test-key' })
        async updateWithError(): Promise<void> {
          throw new Error('Update error');
        }
      }

      const service = new TestService();

      await expect(service.updateWithError()).rejects.toThrow('Update error');
    });
  });

  describe('실제 사용 시나리오', () => {
    it('사용자 서비스 - 조회와 업데이트', async () => {
      class UserService {
        cache = mockCacheService;
        dbCallCount = 0;

        @Cacheable({ key: (id: number) => `user:${id}`, ttl: 3600 })
        async findOne(id: number): Promise<{ id: number; name: string }> {
          this.dbCallCount++;
          // DB 조회 시뮬레이션
          return { id, name: `User ${id}` };
        }

        @CacheInvalidate({ key: (id: number) => `user:${id}` })
        async update(
          id: number,
          name: string,
        ): Promise<{ id: number; name: string }> {
          // DB 업데이트 시뮬레이션
          return { id, name };
        }
      }

      const service = new UserService();

      // 첫 조회
      const user1 = await service.findOne(1);
      expect(user1).toEqual({ id: 1, name: 'User 1' });
      expect(service.dbCallCount).toBe(1);

      // 캐시된 데이터 조회
      await service.findOne(1);
      expect(service.dbCallCount).toBe(1); // DB 호출 안됨

      // 업데이트로 캐시 무효화
      await service.update(1, 'Updated User');

      // 다시 조회 (캐시가 무효화되어 DB 호출)
      await service.findOne(1);
      expect(service.dbCallCount).toBe(2);
    });

    it('게시물 서비스 - 여러 메서드 조합', async () => {
      class PostService {
        cache = mockCacheService;
        fetchCount = 0;

        @Cacheable({
          key: (userId: number) => `user:${userId}:posts`,
          ttl: 1800,
        })
        async getUserPosts(userId: number): Promise<any[]> {
          this.fetchCount++;
          return [
            { id: 1, title: 'Post 1' },
            { id: 2, title: 'Post 2' },
          ];
        }

        @CacheInvalidate({ key: (userId: number) => `user:${userId}:posts` })
        async createPost(userId: number, title: string): Promise<any> {
          return { id: 3, title };
        }

        @CacheInvalidate({ key: (userId: number) => `user:${userId}:posts` })
        async deletePost(userId: number, postId: number): Promise<void> {
          // 삭제 로직
        }
      }

      const service = new PostService();

      // 첫 조회
      await service.getUserPosts(1);
      expect(service.fetchCount).toBe(1);

      // 캐시된 조회
      await service.getUserPosts(1);
      expect(service.fetchCount).toBe(1);

      // 새 게시물 생성 (캐시 무효화)
      await service.createPost(1, 'New Post');

      // 다시 조회 (캐시 무효화로 인해 새로 fetch)
      await service.getUserPosts(1);
      expect(service.fetchCount).toBe(2);

      // 게시물 삭제 (캐시 무효화)
      await service.deletePost(1, 1);

      // 다시 조회
      await service.getUserPosts(1);
      expect(service.fetchCount).toBe(3);
    });
  });

  describe('엣지 케이스', () => {
    it('null 반환값도 캐싱해야 함', async () => {
      class TestService {
        cache = mockCacheService;
        callCount = 0;

        @Cacheable({ key: 'null-key', ttl: 3600 })
        async getNullData(): Promise<null> {
          this.callCount++;
          return null;
        }
      }

      const service = new TestService();

      await service.getNullData();
      await service.getNullData();

      expect(service.callCount).toBe(1); // null도 캐싱됨
    });

    it('undefined 반환값도 캐싱해야 함', async () => {
      class TestService {
        cache = mockCacheService;
        callCount = 0;

        @Cacheable({ key: 'undefined-key', ttl: 3600 })
        async getUndefinedData(): Promise<undefined> {
          this.callCount++;
          return undefined;
        }
      }

      const service = new TestService();

      await service.getUndefinedData();
      await service.getUndefinedData();

      expect(service.callCount).toBe(1);
    });

    it('0이나 false 같은 falsy 값도 캐싱해야 함', async () => {
      class TestService {
        cache = mockCacheService;
        zeroCallCount = 0;
        falseCallCount = 0;

        @Cacheable({ key: 'zero-key', ttl: 3600 })
        async getZero(): Promise<number> {
          this.zeroCallCount++;
          return 0;
        }

        @Cacheable({ key: 'false-key', ttl: 3600 })
        async getFalse(): Promise<boolean> {
          this.falseCallCount++;
          return false;
        }
      }

      const service = new TestService();

      await service.getZero();
      await service.getZero();
      expect(service.zeroCallCount).toBe(1);

      await service.getFalse();
      await service.getFalse();
      expect(service.falseCallCount).toBe(1);
    });
  });
});
