import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CRUD 훅 파라미터 데코레이터
 *
 * 훅 메서드에서 요청 데이터를 타입 안전하게 추출합니다.
 */

// ========================================
// 요청 데이터 추출
// ========================================

/**
 * @ParsedBody 데코레이터
 *
 * 요청 본문 (DTO)를 추출합니다.
 *
 * 사용 예시:
 * ```typescript
 * @BeforeCreate()
 * async beforeCreateHook(@ParsedBody() dto: CreateUserDto) {
 *   dto.password = await hash(dto.password);
 *   return dto;
 * }
 * ```
 */
export const ParsedBody = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const body = request.body;

    // 특정 필드만 추출
    if (data) {
      return body?.[data];
    }

    return body;
  },
);

/**
 * @ParsedParams 데코레이터
 *
 * URL 파라미터를 추출합니다.
 *
 * 사용 예시:
 * ```typescript
 * @BeforeUpdate()
 * async beforeUpdateHook(@ParsedParams() params: { id: string }) {
 *   if (!isValidUUID(params.id)) {
 *     throw new BadRequestException('Invalid ID');
 *   }
 * }
 * ```
 */
export const ParsedParams = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const params = request.params;

    // 특정 파라미터만 추출
    if (data) {
      return params?.[data];
    }

    return params;
  },
);

/**
 * @ParsedQuery 데코레이터
 *
 * 쿼리 파라미터를 추출합니다.
 *
 * 사용 예시:
 * ```typescript
 * @BeforeModelInit([CrudOperation.Index])
 * async beforeIndexHook(@ParsedQuery() query: any) {
 *   // 쿼리 검증
 *   if (query.limit && query.limit > 100) {
 *     throw new BadRequestException('Limit too large');
 *   }
 * }
 * ```
 */
export const ParsedQuery = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    // 특정 쿼리만 추출
    if (data) {
      return query?.[data];
    }

    return query;
  },
);

/**
 * @ParsedRequest 데코레이터
 *
 * 전체 요청 컨텍스트를 추출합니다.
 *
 * 사용 예시:
 * ```typescript
 * @BeforeCreate()
 * async beforeCreateHook(@ParsedRequest() req: any) {
 *   const user = req.user;
 *   const ip = req.ip;
 *   // ...
 * }
 * ```
 */
export const ParsedRequest = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // 특정 속성만 추출
    if (data) {
      return request?.[data];
    }

    return request;
  },
);

// ========================================
// 엔티티 데이터 추출
// ========================================

/**
 * @CreatedEntity 데코레이터
 *
 * 생성된 엔티티를 추출합니다. (@AfterCreate에서 사용)
 *
 * 사용 예시:
 * ```typescript
 * @AfterCreate()
 * async afterCreateHook(@CreatedEntity() user: User) {
 *   await this.emailService.sendWelcomeEmail(user.email);
 *   return user;
 * }
 * ```
 */
export const CreatedEntity = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const entity = request.__createdEntity;

    if (data && entity) {
      return entity[data];
    }

    return entity;
  },
);

/**
 * @UpdatedEntity 데코레이터
 *
 * 수정된 엔티티를 추출합니다. (@AfterUpdate에서 사용)
 *
 * 사용 예시:
 * ```typescript
 * @AfterUpdate()
 * async afterUpdateHook(@UpdatedEntity() user: User) {
 *   await this.cacheService.invalidate(`user:${user.id}`);
 *   return user;
 * }
 * ```
 */
export const UpdatedEntity = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const entity = request.__updatedEntity;

    if (data && entity) {
      return entity[data];
    }

    return entity;
  },
);

/**
 * @DeletedEntity 데코레이터
 *
 * 삭제된 엔티티를 추출합니다. (@AfterDelete에서 사용)
 *
 * 사용 예시:
 * ```typescript
 * @AfterDelete()
 * async afterDeleteHook(@DeletedEntity() user: User) {
 *   await this.auditLogService.log({
 *     action: 'DELETE',
 *     resourceType: 'User',
 *     resourceId: user.id
 *   });
 * }
 * ```
 */
export const DeletedEntity = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const entity = request.__deletedEntity;

    if (data && entity) {
      return entity[data];
    }

    return entity;
  },
);

/**
 * @LoadedEntity 데코레이터
 *
 * 로드된 엔티티를 추출합니다. (@AfterModelInit에서 사용)
 *
 * 사용 예시:
 * ```typescript
 * @AfterModelInit([CrudOperation.Index, CrudOperation.Show])
 * async afterLoadHook(@LoadedEntity() entity: User | User[]) {
 *   if (Array.isArray(entity)) {
 *     return entity.map(e => this.removeSensitiveFields(e));
 *   }
 *   return this.removeSensitiveFields(entity);
 * }
 * ```
 */
export const LoadedEntity = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const entity = request.__loadedEntity;

    if (data && entity) {
      if (Array.isArray(entity)) {
        return entity.map((e) => e[data]);
      }
      return entity[data];
    }

    return entity;
  },
);

// ========================================
// 컨텍스트 데이터 추출
// ========================================

/**
 * @CurrentUser 데코레이터
 *
 * 현재 인증된 사용자를 추출합니다.
 *
 * 사용 예시:
 * ```typescript
 * @BeforeUpdate()
 * async beforeUpdateHook(
 *   @ParsedParams() params: any,
 *   @CurrentUser() currentUser: User
 * ) {
 *   if (currentUser.id !== params.id && !currentUser.isAdmin) {
 *     throw new ForbiddenException('다른 사용자 수정 불가');
 *   }
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (data && user) {
      return user[data];
    }

    return user;
  },
);

/**
 * @ClientIp 데코레이터
 *
 * 클라이언트 IP 주소를 추출합니다.
 *
 * 사용 예시:
 * ```typescript
 * @AfterCreate()
 * async afterCreateHook(@ClientIp() ip: string) {
 *   await this.auditLogService.log({
 *     action: 'CREATE',
 *     ip: ip
 *   });
 * }
 * ```
 */
export const ClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.connection.remoteAddress
    );
  },
);

/**
 * @RequestHeaders 데코레이터
 *
 * 요청 헤더를 추출합니다.
 *
 * 사용 예시:
 * ```typescript
 * @BeforeCreate()
 * async beforeCreateHook(@RequestHeaders() headers: any) {
 *   const userAgent = headers['user-agent'];
 *   // ...
 * }
 * ```
 */
export const RequestHeaders = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const headers = request.headers;

    if (data) {
      return headers?.[data.toLowerCase()];
    }

    return headers;
  },
);
