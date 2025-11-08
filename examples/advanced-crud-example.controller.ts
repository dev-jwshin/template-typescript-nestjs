import { Controller, Injectable } from '@nestjs/common';
import { Crud } from '../src/common/crud/decorators/crud.decorator';
import {
  BeforeCreate,
  AfterCreate,
  BeforeUpdate,
  AfterUpdate,
  BeforeDelete,
  AfterDelete,
  Before,
  After,
} from '../src/common/crud/decorators/hook.decorator';
import {
  ParsedBody,
  CreatedEntity,
  UpdatedEntity,
  DeletedEntity,
  CurrentUser,
  ParsedParams,
} from '../src/common/crud/decorators/param.decorator';
import { CrudOperation } from '../src/common/crud/types/crud-operation.enum';
import { AuditLogPlugin } from '../src/common/crud/plugins/audit-log.plugin';
import { withCachingOptions } from '../src/common/crud/plugins/caching.plugin';
import { withRateLimitOptions } from '../src/common/crud/plugins/rate-limit.plugin';

/**
 * 고급 CRUD 예제: 블로그 포스트 시스템
 *
 * 이 예제는 다음 기능을 보여줍니다:
 * - 모든 CRUD 작업 자동 생성
 * - 훅을 통한 비즈니스 로직 구현
 * - 플러그인을 통한 기능 확장
 * - 성능 최적화
 * - 보안 설정
 */
@Crud({
  // 1. 생성할 CRUD 엔드포인트 정의
  only: [
    CrudOperation.Index,   // GET /posts
    CrudOperation.Show,    // GET /posts/:id
    CrudOperation.Create,  // POST /posts
    CrudOperation.Update,  // PATCH /posts/:id
    CrudOperation.Delete,  // DELETE /posts/:id
  ],

  // 2. JSON:API 리소스 타입
  resourceType: 'posts',

  // 3. 허용 파라미터 (화이트리스트 방식)
  allowedParams: {
    title: { required: true },
    content: { required: true },
    excerpt: { required: false },
    tags: { required: false },
    published: { required: false },
    featured: { required: false },
  },

  // 4. 필터링 설정
  allowedFilters: {
    title: ['eq', 'like'],           // title=... 또는 title[like]=...
    tags: ['in'],                     // tags[in]=tag1,tag2,tag3
    published: ['eq'],                // published=true
    featured: ['eq'],                 // featured=true
    createdAt: ['gte', 'lte'],       // createdAt[gte]=2025-01-01
  },

  // 5. 정렬 설정
  allowedSorts: [
    'createdAt',
    'updatedAt',
    'title',
    'viewCount',
  ],

  // 6. 관계 포함 설정
  allowedIncludes: [
    'author',
    'author.profile',
    'comments',
    'tags',
  ],

  // 7. 페이지네이션 설정
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // 8. 플러그인 설정
  plugins: [
    // 감사 로그: 모든 CUD 작업 자동 로깅
    AuditLogPlugin,

    // 캐싱: 조회 결과 자동 캐싱
    withCachingOptions({
      ttl: 300,              // 5분
      keyPrefix: 'posts',
      cacheIndex: true,
      cacheShow: true,
      invalidateOnMutation: true,
    }),

    // Rate Limiting: API 남용 방지
    withRateLimitOptions({
      maxRequests: 30,       // 1분당 30회
      windowMs: 60000,
      operations: [CrudOperation.Create, CrudOperation.Update, CrudOperation.Delete],
    }),
  ],

  // 9. 성능 최적화
  performance: {
    query: {
      eagerLoad: true,      // N+1 쿼리 방지
      timeout: 5000,        // 5초 타임아웃
    },
    cache: {
      enabled: true,
      ttl: 300,
      keyStrategy: 'query-based',
      invalidateOn: [CrudOperation.Create, CrudOperation.Update, CrudOperation.Delete],
    },
  },

  // 10. 응답 직렬화
  serialize: {
    exclude: ['deletedAt', 'authorId'],
    transform: (data) => {
      // 조회수 포맷팅
      if (data.viewCount) {
        data.viewCountFormatted = data.viewCount.toLocaleString();
      }
      return data;
    },
  },

  // 11. Soft Delete
  softDelete: true,

  // 12. 작업별 개별 설정 (전역 설정 오버라이드)
  routes: {
    [CrudOperation.Create]: {
      allowedParams: {
        title: { required: true },
        content: { required: true },
        excerpt: { required: false },
        tags: { required: false },
      },
      swagger: {
        summary: '새 블로그 포스트 작성',
        description: '제목과 내용은 필수입니다. 태그는 배열로 전달하세요.',
      },
    },

    [CrudOperation.Update]: {
      allowedParams: {
        title: { required: false },
        content: { required: false },
        excerpt: { required: false },
        tags: { required: false },
        published: { required: false },
      },
      swagger: {
        summary: '블로그 포스트 수정',
        description: '수정할 필드만 전달하면 됩니다.',
      },
    },

    [CrudOperation.Index]: {
      pagination: {
        defaultLimit: 10,
        maxLimit: 50,
      },
      swagger: {
        summary: '블로그 포스트 목록 조회',
        description: '필터링, 정렬, 페이지네이션을 지원합니다.',
      },
    },
  },
})
@Controller('posts')
export class AdvancedCrudExampleController {
  constructor(
    private readonly postsService: any,
    private readonly searchService: any,
    private readonly analyticsService: any,
    private readonly notificationService: any,
  ) {}

  // ===================================================================
  // Create 훅
  // ===================================================================

  /**
   * 포스트 생성 전 처리
   * - Slug 자동 생성
   * - 발행 상태 기본값 설정
   * - Excerpt 자동 생성 (없는 경우)
   */
  @BeforeCreate()
  async beforeCreatePost(@ParsedBody() dto: any, @CurrentUser() user: any) {
    // 1. Slug 생성 (URL 친화적 문자열)
    dto.slug = this.generateSlug(dto.title);

    // 2. 작성자 ID 설정
    dto.authorId = user.id;

    // 3. 발행 상태 기본값
    dto.published = dto.published ?? false;

    // 4. Excerpt 자동 생성 (없는 경우)
    if (!dto.excerpt && dto.content) {
      dto.excerpt = this.generateExcerpt(dto.content);
    }

    // 5. 초기 조회수
    dto.viewCount = 0;

    return dto;
  }

  /**
   * 포스트 생성 후 처리
   * - 검색 엔진 인덱싱
   * - 분석 이벤트 기록
   * - 알림 발송
   */
  @AfterCreate()
  async afterCreatePost(@CreatedEntity() post: any) {
    // 1. 검색 엔진 인덱싱
    await this.searchService.indexPost(post);

    // 2. 분석 이벤트
    await this.analyticsService.trackEvent('post_created', {
      postId: post.id,
      authorId: post.authorId,
      tags: post.tags,
    });

    // 3. 팔로워 알림 (발행된 경우)
    if (post.published) {
      await this.notificationService.notifyFollowers(post.authorId, {
        type: 'new_post',
        postId: post.id,
        title: post.title,
      });
    }

    return post;
  }

  // ===================================================================
  // Update 훅
  // ===================================================================

  /**
   * 포스트 수정 전 처리
   * - Slug 재생성 (제목 변경 시)
   * - 수정 시간 기록
   * - 권한 검증
   */
  @BeforeUpdate()
  async beforeUpdatePost(
    @ParsedBody() dto: any,
    @ParsedParams() params: any,
    @CurrentUser() user: any,
  ) {
    // 1. 기존 포스트 조회
    const existingPost = await this.postsService.findOne(params.id);

    // 2. 권한 검증 (작성자 또는 관리자만 수정 가능)
    if (existingPost.authorId !== user.id && user.role !== 'admin') {
      throw new Error('Forbidden: You can only update your own posts');
    }

    // 3. 제목 변경 시 Slug 재생성
    if (dto.title && dto.title !== existingPost.title) {
      dto.slug = this.generateSlug(dto.title);
    }

    // 4. 수정 시간 기록
    dto.updatedAt = new Date();

    return dto;
  }

  /**
   * 포스트 수정 후 처리
   * - 검색 인덱스 갱신
   * - 캐시 무효화
   * - 변경 이력 기록
   */
  @AfterUpdate()
  async afterUpdatePost(@UpdatedEntity() post: any) {
    // 1. 검색 인덱스 갱신
    await this.searchService.updatePost(post);

    // 2. 분석 이벤트
    await this.analyticsService.trackEvent('post_updated', {
      postId: post.id,
      authorId: post.authorId,
    });

    // 3. 발행 상태 변경 시 알림
    if (post.published && !post._previousPublished) {
      await this.notificationService.notifyFollowers(post.authorId, {
        type: 'post_published',
        postId: post.id,
        title: post.title,
      });
    }

    return post;
  }

  // ===================================================================
  // Delete 훅
  // ===================================================================

  /**
   * 포스트 삭제 전 처리
   * - 권한 검증
   * - 관련 데이터 정리
   */
  @BeforeDelete()
  async beforeDeletePost(@ParsedParams() params: any, @CurrentUser() user: any) {
    // 1. 기존 포스트 조회
    const post = await this.postsService.findOne(params.id);

    // 2. 권한 검증
    if (post.authorId !== user.id && user.role !== 'admin') {
      throw new Error('Forbidden: You can only delete your own posts');
    }

    // 3. 백업 (중요한 포스트인 경우)
    if (post.featured || post.viewCount > 10000) {
      await this.postsService.backup(post);
    }
  }

  /**
   * 포스트 삭제 후 처리
   * - 검색 인덱스 삭제
   * - 관련 파일 정리
   * - 분석 이벤트 기록
   */
  @AfterDelete()
  async afterDeletePost(@DeletedEntity() post: any) {
    // 1. 검색 인덱스 삭제
    await this.searchService.deletePost(post.id);

    // 2. 이미지 파일 정리
    if (post.images && post.images.length > 0) {
      await this.postsService.deleteImages(post.images);
    }

    // 3. 분석 이벤트
    await this.analyticsService.trackEvent('post_deleted', {
      postId: post.id,
      authorId: post.authorId,
    });

    return post;
  }

  // ===================================================================
  // 커스텀 엔드포인트
  // ===================================================================

  /**
   * 포스트 발행
   * 커스텀 엔드포인트 예제
   */
  async publishPost(id: string, @CurrentUser() user: any) {
    const post = await this.postsService.findOne(id);

    if (post.authorId !== user.id && user.role !== 'admin') {
      throw new Error('Forbidden');
    }

    return this.postsService.publish(id);
  }

  @Before('publishPost')
  async beforePublish(@ParsedParams() params: any) {
    const post = await this.postsService.findOne(params.id);

    // 발행 조건 검증
    if (!post.title || !post.content) {
      throw new Error('Title and content are required');
    }

    if (post.published) {
      throw new Error('Post is already published');
    }
  }

  @After('publishPost')
  async afterPublish(@UpdatedEntity() post: any) {
    // 팔로워에게 알림
    await this.notificationService.notifyFollowers(post.authorId, {
      type: 'post_published',
      postId: post.id,
      title: post.title,
    });

    // 검색 인덱스 우선순위 상승
    await this.searchService.boostPost(post.id);

    return post;
  }

  // ===================================================================
  // 헬퍼 메서드
  // ===================================================================

  /**
   * Slug 생성
   * "Hello World" → "hello-world"
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Excerpt 생성 (첫 150자)
   */
  private generateExcerpt(content: string, length: number = 150): string {
    const stripped = content.replace(/<[^>]*>/g, ''); // HTML 태그 제거
    return stripped.length > length
      ? stripped.substring(0, length) + '...'
      : stripped;
  }
}

/**
 * 사용 예시:
 *
 * 1. 목록 조회 (필터링, 정렬, 페이지네이션)
 * GET /posts?filter[published]=true&sort=-createdAt&page[number]=1&page[size]=10
 *
 * 2. 관계 포함
 * GET /posts?include=author,comments
 *
 * 3. 특정 필드만 조회
 * GET /posts?fields[posts]=title,excerpt,createdAt
 *
 * 4. 포스트 생성
 * POST /posts
 * {
 *   "title": "My First Post",
 *   "content": "This is the content...",
 *   "tags": ["typescript", "nestjs"]
 * }
 *
 * 5. 포스트 수정
 * PATCH /posts/123
 * {
 *   "title": "Updated Title",
 *   "published": true
 * }
 *
 * 6. 포스트 삭제
 * DELETE /posts/123
 */
