import { Test, TestingModule } from '@nestjs/testing';
import { CrudBaseService, ServiceRegistry } from '../index';
import { PrismaService } from '../../../database/prisma.service';
import { BaseSerializer } from '../serializers/base.serializer';
import { SerializerRegistry } from '../serializers/serializer-registry';

/**
 * 재귀적 직렬화 테스트
 *
 * include로 가져온 관계 데이터에도 각 모델의 Serializer가
 * 올바르게 적용되는지 검증합니다.
 */
describe('Recursive Serialization', () => {
  let postsService: PostsTestService;
  let commentsService: CommentsTestService;
  let prisma: PrismaService;

  // Mock Prisma Service
  const mockPrisma = {
    post: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
    },
    postNoRel: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  // Comment Serializer
  class CommentSerializer extends BaseSerializer<any> {
    protected excludeFields = ['authorEmail', 'authorIp'];
  }

  // Post Serializer
  class PostSerializer extends BaseSerializer<any> {
    protected excludeFields = ['isDraft'];
    protected relations = {
      comments: 'comment',
    };
  }

  // Comment 테스트 서비스
  class CommentsTestService extends CrudBaseService<any> {
    constructor(prisma: PrismaService) {
      super(prisma, 'comment', {});
    }
  }

  // Post 테스트 서비스
  class PostsTestService extends CrudBaseService<any> {
    constructor(prisma: PrismaService) {
      super(prisma, 'post', {
        allowedIncludes: ['comments'],
      });
    }
  }

  beforeEach(async () => {
    // ServiceRegistry 초기화
    ServiceRegistry.clear();
    SerializerRegistry.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: CommentsTestService,
          useFactory: (prisma: PrismaService) => new CommentsTestService(prisma),
          inject: [PrismaService],
        },
        {
          provide: PostsTestService,
          useFactory: (prisma: PrismaService) => new PostsTestService(prisma),
          inject: [PrismaService],
        },
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    commentsService = module.get<CommentsTestService>(CommentsTestService);
    postsService = module.get<PostsTestService>(PostsTestService);

    // Serializer 등록
    SerializerRegistry.register('comment', new CommentSerializer());
    SerializerRegistry.register('post', new PostSerializer());
  });

  afterEach(() => {
    jest.clearAllMocks();
    ServiceRegistry.clear();
    SerializerRegistry.clear();
  });

  describe('단일 관계 직렬화', () => {
    it('include로 가져온 단일 관계에도 serialize.exclude가 적용되어야 함', async () => {
      // Mock 데이터 (DB에서 가져온 원본 데이터)
      const mockPost = {
        id: 'post-1',
        title: 'Test Post',
        content: 'Content',
        isDraft: true, // ← Post에서 제외되어야 함
        authorId: 'user-1',
        createdAt: new Date(),
        comments: [
          {
            id: 'comment-1',
            content: 'Comment 1',
            authorName: '홍길동',
            authorEmail: 'hong@example.com', // ← Comment에서 제외되어야 함
            authorIp: '192.168.1.1', // ← Comment에서 제외되어야 함
            postId: 'post-1',
            createdAt: new Date(),
          },
          {
            id: 'comment-2',
            content: 'Comment 2',
            authorName: '김철수',
            authorEmail: 'kim@example.com', // ← Comment에서 제외되어야 함
            authorIp: '192.168.1.2', // ← Comment에서 제외되어야 함
            postId: 'post-1',
            createdAt: new Date(),
          },
        ],
      };

      mockPrisma.post.findUnique.mockResolvedValue(mockPost);

      // Act
      const result = await postsService.findOne('post-1');

      // Assert: Post의 isDraft 제외
      expect(result).not.toHaveProperty('isDraft');
      expect(result).toHaveProperty('id', 'post-1');
      expect(result).toHaveProperty('title', 'Test Post');

      // Assert: Comments의 authorEmail, authorIp 제외
      expect(result.comments).toHaveLength(2);

      result.comments.forEach((comment: any) => {
        expect(comment).not.toHaveProperty('authorEmail');
        expect(comment).not.toHaveProperty('authorIp');
        expect(comment).toHaveProperty('id');
        expect(comment).toHaveProperty('content');
        expect(comment).toHaveProperty('authorName');
      });
    });
  });

  describe('배열 관계 직렬화', () => {
    it('include로 가져온 배열 관계의 모든 항목에 serialize.exclude가 적용되어야 함', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'Post 1',
          isDraft: true,
          comments: [
            {
              id: 'comment-1',
              authorEmail: 'test1@example.com',
              authorIp: '192.168.1.1',
            },
          ],
        },
        {
          id: 'post-2',
          title: 'Post 2',
          isDraft: false,
          comments: [
            {
              id: 'comment-2',
              authorEmail: 'test2@example.com',
              authorIp: '192.168.1.2',
            },
          ],
        },
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      // Act
      const results = (await postsService.findAll()) as any[];

      // Assert
      results.forEach((post) => {
        // Post의 isDraft 제외 확인
        expect(post).not.toHaveProperty('isDraft');

        // Comments의 민감 정보 제외 확인
        post.comments.forEach((comment: any) => {
          expect(comment).not.toHaveProperty('authorEmail');
          expect(comment).not.toHaveProperty('authorIp');
        });
      });
    });
  });

  describe('ServiceRegistry', () => {
    it('서비스가 자동으로 등록되어야 함', () => {
      expect(ServiceRegistry.has('post')).toBe(true);
      expect(ServiceRegistry.has('comment')).toBe(true);
    });

    it('등록된 서비스를 조회할 수 있어야 함', () => {
      const postService = ServiceRegistry.get('post');
      const commentService = ServiceRegistry.get('comment');

      expect(postService).toBe(postsService);
      expect(commentService).toBe(commentsService);
    });

    it('존재하지 않는 서비스 조회 시 undefined 반환', () => {
      const nonExistentService = ServiceRegistry.get('nonexistent');
      expect(nonExistentService).toBeUndefined();
    });
  });

  describe('관계 설정이 없는 경우', () => {
    it('Serializer 미등록 시 관계 데이터는 원본 그대로 반환', async () => {
      // Serializer 없이 서비스 생성
      class PostsNoSerializerService extends CrudBaseService<any> {
        constructor(prisma: PrismaService) {
          super(prisma, 'postNoRel', {});
        }
      }

      const module = await Test.createTestingModule({
        providers: [
          { provide: PrismaService, useValue: mockPrisma },
          {
            provide: PostsNoSerializerService,
            useFactory: (prisma: PrismaService) => new PostsNoSerializerService(prisma),
            inject: [PrismaService],
          },
        ],
      }).compile();

      const service = module.get<PostsNoSerializerService>(PostsNoSerializerService);

      const mockData = {
        id: 'post-1',
        isDraft: true,
        comments: [
          {
            id: 'comment-1',
            authorEmail: 'test@example.com', // ← 그대로 유지됨
          },
        ],
      };

      mockPrisma.postNoRel.findUnique.mockResolvedValue(mockData);

      const result = await service.findOne('post-1');

      // Serializer가 없으므로 원본 그대로 반환
      expect(result).toHaveProperty('isDraft', true);
      expect(result.comments[0]).toHaveProperty('authorEmail', 'test@example.com');
    });
  });

  describe('중첩된 관계 직렬화', () => {
    it('null/undefined 관계는 안전하게 처리되어야 함', async () => {
      const mockPost = {
        id: 'post-1',
        title: 'Post without comments',
        isDraft: true,
        comments: null, // 관계가 null
      };

      mockPrisma.post.findUnique.mockResolvedValue(mockPost);

      const result = await postsService.findOne('post-1');

      expect(result).not.toHaveProperty('isDraft');
      expect(result.comments).toBeNull();
    });

    it('빈 배열 관계는 빈 배열로 반환되어야 함', async () => {
      const mockPost = {
        id: 'post-1',
        title: 'Post with no comments',
        isDraft: true,
        comments: [], // 빈 배열
      };

      mockPrisma.post.findUnique.mockResolvedValue(mockPost);

      const result = await postsService.findOne('post-1');

      expect(result).not.toHaveProperty('isDraft');
      expect(result.comments).toEqual([]);
    });
  });
});
