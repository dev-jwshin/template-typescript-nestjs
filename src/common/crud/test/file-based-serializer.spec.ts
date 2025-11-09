import { BaseSerializer } from '../serializers/base.serializer';
import { SerializerRegistry } from '../serializers/serializer-registry';

describe('File-Based Serializer System', () => {
  // 테스트용 타입 정의
  interface User {
    id: string;
    name: string;
    email: string;
    password: string;
    profile?: Profile;
  }

  interface Profile {
    id: string;
    bio: string;
    phone: string;
    user?: User;
  }

  // 테스트용 Serializer 클래스
  class UserSerializer extends BaseSerializer<User> {
    protected excludeFields = ['password'];
    protected relations = {
      profile: 'profile',
    };
  }

  class ProfileSerializer extends BaseSerializer<Profile> {
    protected excludeFields = ['phone'];
    protected relations = {
      user: 'user',
    };
  }

  beforeEach(() => {
    // 각 테스트 전에 레지스트리 초기화
    SerializerRegistry.clear();
  });

  describe('BaseSerializer', () => {
    it('excludeFields: 지정된 필드를 제외해야 함', () => {
      const userSerializer = new UserSerializer();
      const user: User = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
      };

      const serialized = userSerializer.serialize(user);

      expect(serialized).toEqual({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        // password는 제외됨
      });
      expect(serialized).not.toHaveProperty('password');
    });

    it('배열 데이터를 직렬화해야 함', () => {
      const userSerializer = new UserSerializer();
      const users: User[] = [
        {
          id: '1',
          name: 'John',
          email: 'john@example.com',
          password: 'secret1',
        },
        {
          id: '2',
          name: 'Jane',
          email: 'jane@example.com',
          password: 'secret2',
        },
      ];

      const serialized = userSerializer.serialize(users) as Partial<User>[];

      expect(Array.isArray(serialized)).toBe(true);
      expect(serialized).toHaveLength(2);
      expect(serialized[0]).not.toHaveProperty('password');
      expect(serialized[1]).not.toHaveProperty('password');
    });

    it('null/undefined를 처리해야 함', () => {
      const userSerializer = new UserSerializer();

      expect(userSerializer.serialize(null)).toBeNull();
      expect(userSerializer.serialize(undefined)).toBeUndefined();
    });
  });

  describe('SerializerRegistry', () => {
    it('Serializer를 등록하고 조회할 수 있어야 함', () => {
      const userSerializer = new UserSerializer();
      SerializerRegistry.register('user', userSerializer);

      const retrieved = SerializerRegistry.get('user');

      expect(retrieved).toBe(userSerializer);
    });

    it('등록되지 않은 Serializer는 undefined를 반환해야 함', () => {
      const retrieved = SerializerRegistry.get('nonexistent');

      expect(retrieved).toBeUndefined();
    });

    it('has() 메서드가 정상 동작해야 함', () => {
      SerializerRegistry.register('user', new UserSerializer());

      expect(SerializerRegistry.has('user')).toBe(true);
      expect(SerializerRegistry.has('nonexistent')).toBe(false);
    });

    it('unregister() 메서드가 정상 동작해야 함', () => {
      SerializerRegistry.register('user', new UserSerializer());

      expect(SerializerRegistry.has('user')).toBe(true);

      SerializerRegistry.unregister('user');

      expect(SerializerRegistry.has('user')).toBe(false);
    });

    it('getAll() 메서드가 모든 Serializer를 반환해야 함', () => {
      const userSerializer = new UserSerializer();
      const profileSerializer = new ProfileSerializer();

      SerializerRegistry.register('user', userSerializer);
      SerializerRegistry.register('profile', profileSerializer);

      const all = SerializerRegistry.getAll();

      expect(all.size).toBe(2);
      expect(all.get('user')).toBe(userSerializer);
      expect(all.get('profile')).toBe(profileSerializer);
    });
  });

  describe('재귀적 직렬화', () => {
    it('관계 데이터를 재귀적으로 직렬화해야 함', () => {
      // Serializer 등록
      SerializerRegistry.register('user', new UserSerializer());
      SerializerRegistry.register('profile', new ProfileSerializer());

      const userSerializer = new UserSerializer();
      const serializerRegistry = SerializerRegistry.getAll();

      const user: User = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
        profile: {
          id: '2',
          bio: 'Software Engineer',
          phone: '010-1234-5678',
        },
      };

      const serialized = userSerializer.serialize(user, serializerRegistry) as any;

      expect(serialized).toEqual({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        // password는 제외됨
        profile: {
          id: '2',
          bio: 'Software Engineer',
          // phone은 제외됨 (ProfileSerializer에 의해)
        },
      });
      expect(serialized).not.toHaveProperty('password');
      expect(serialized.profile).not.toHaveProperty('phone');
    });

    it('순환 참조를 처리해야 함', () => {
      // Serializer 등록
      SerializerRegistry.register('user', new UserSerializer());
      SerializerRegistry.register('profile', new ProfileSerializer());

      const profileSerializer = new ProfileSerializer();
      const serializerRegistry = SerializerRegistry.getAll();

      const profile: Profile = {
        id: '2',
        bio: 'Software Engineer',
        phone: '010-1234-5678',
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          password: 'secret123',
        },
      };

      const serialized = profileSerializer.serialize(profile, serializerRegistry) as any;

      expect(serialized).toEqual({
        id: '2',
        bio: 'Software Engineer',
        // phone은 제외됨
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          // password는 제외됨 (UserSerializer에 의해)
        },
      });
      expect(serialized).not.toHaveProperty('phone');
      expect(serialized.user).not.toHaveProperty('password');
    });

    it('관계 배열 데이터를 직렬화해야 함', () => {
      // 테스트용 타입 정의
      interface Post {
        id: string;
        title: string;
        author?: User;
      }

      // 테스트용 Serializer
      class PostSerializer extends BaseSerializer<Post> {
        protected relations = {
          author: 'user',
        };
      }

      class UserWithPostsSerializer extends BaseSerializer<User> {
        protected excludeFields = ['password'];
        protected relations = {
          posts: 'post',
        };
      }

      // Serializer 등록
      SerializerRegistry.register('user', new UserWithPostsSerializer());
      SerializerRegistry.register('post', new PostSerializer());

      const userSerializer = new UserWithPostsSerializer();
      const serializerRegistry = SerializerRegistry.getAll();

      const user = {
        id: '1',
        name: 'John',
        email: 'john@example.com',
        password: 'secret',
        posts: [
          {
            id: 'post1',
            title: 'First Post',
          },
          {
            id: 'post2',
            title: 'Second Post',
          },
        ],
      };

      const serialized = userSerializer.serialize(user as any, serializerRegistry);

      expect(serialized).toEqual({
        id: '1',
        name: 'John',
        email: 'john@example.com',
        // password는 제외됨
        posts: [
          {
            id: 'post1',
            title: 'First Post',
          },
          {
            id: 'post2',
            title: 'Second Post',
          },
        ],
      });
    });
  });

  describe('커스텀 변환 함수', () => {
    it('transform() 메서드를 통해 추가 변환을 수행해야 함', () => {
      class UserWithTransformSerializer extends BaseSerializer<User> {
        protected excludeFields = ['password'];

        protected transform(data: Partial<User>): any {
          return {
            ...data,
            displayName: `${data.name} (${data.email})`,
          };
        }
      }

      const userSerializer = new UserWithTransformSerializer();
      const user: User = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
      };

      const serialized = userSerializer.serialize(user) as any;

      expect(serialized).toEqual({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        displayName: 'John Doe (john@example.com)',
      });
    });
  });
});
