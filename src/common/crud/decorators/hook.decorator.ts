import { CrudHookType } from '../types/crud-hook.interface';
import { CrudOperation } from '../types/crud-operation.enum';
import { CrudHookMetadataStorage } from '../metadata/crud-hook-metadata.storage';

/**
 * 훅 데코레이터 옵션
 */
interface HookDecoratorOptions {
  /**
   * 훅이 적용될 CRUD 작업 (선택적)
   * 지정하지 않으면 모든 작업에 적용
   */
  operations?: CrudOperation[];

  /**
   * 훅 우선순위 (낮을수록 먼저 실행)
   * 기본값: 0
   */
  priority?: number;
}

/**
 * 훅 데코레이터 팩토리
 *
 * @param type 훅 타입
 * @param options 훅 옵션
 * @returns 메서드 데코레이터
 */
function createHookDecorator(
  type: CrudHookType,
  options: HookDecoratorOptions = {},
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    // 훅 메타데이터 저장
    CrudHookMetadataStorage.addHook(target.constructor, {
      type,
      methodName: propertyKey.toString(),
      operations: options.operations,
      priority: options.priority || 0,
    });

    return descriptor;
  };
}

// ========================================
// Create 훅
// ========================================

/**
 * @BeforeCreate 데코레이터
 *
 * 사용자 생성 **전**에 실행되는 훅입니다.
 *
 * 사용 예시:
 * ```typescript
 * @BeforeCreate()
 * async beforeCreateHook(@ParsedBody() dto: CreateUserDto) {
 *   dto.password = await hash(dto.password);
 *   return dto;
 * }
 * ```
 *
 * @param options 훅 옵션
 */
export function BeforeCreate(
  options: HookDecoratorOptions = {},
): MethodDecorator {
  return createHookDecorator(CrudHookType.BeforeCreate, options);
}

/**
 * @AfterCreate 데코레이터
 *
 * 사용자 생성 **후**에 실행되는 훅입니다.
 *
 * 사용 예시:
 * ```typescript
 * @AfterCreate()
 * async afterCreateHook(@CreatedEntity() user: User) {
 *   await this.emailService.sendWelcomeEmail(user.email);
 *   return user;
 * }
 * ```
 *
 * @param options 훅 옵션
 */
export function AfterCreate(
  options: HookDecoratorOptions = {},
): MethodDecorator {
  return createHookDecorator(CrudHookType.AfterCreate, options);
}

// ========================================
// Update 훅
// ========================================

/**
 * @BeforeUpdate 데코레이터
 *
 * 사용자 수정 **전**에 실행되는 훅입니다.
 *
 * 사용 예시:
 * ```typescript
 * @BeforeUpdate()
 * async beforeUpdateHook(@ParsedBody() dto: UpdateUserDto, @ParsedParams() params: any) {
 *   if (dto.password) {
 *     dto.password = await hash(dto.password);
 *   }
 *   return dto;
 * }
 * ```
 *
 * @param options 훅 옵션
 */
export function BeforeUpdate(
  options: HookDecoratorOptions = {},
): MethodDecorator {
  return createHookDecorator(CrudHookType.BeforeUpdate, options);
}

/**
 * @AfterUpdate 데코레이터
 *
 * 사용자 수정 **후**에 실행되는 훅입니다.
 *
 * 사용 예시:
 * ```typescript
 * @AfterUpdate()
 * async afterUpdateHook(@UpdatedEntity() user: User) {
 *   await this.cacheService.invalidate(`user:${user.id}`);
 *   return user;
 * }
 * ```
 *
 * @param options 훅 옵션
 */
export function AfterUpdate(
  options: HookDecoratorOptions = {},
): MethodDecorator {
  return createHookDecorator(CrudHookType.AfterUpdate, options);
}

// ========================================
// Delete 훅
// ========================================

/**
 * @BeforeDelete 데코레이터
 *
 * 사용자 삭제 **전**에 실행되는 훅입니다.
 *
 * 사용 예시:
 * ```typescript
 * @BeforeDelete()
 * async beforeDeleteHook(@ParsedParams() params: any) {
 *   // 삭제 가능 여부 확인
 *   const user = await this.service.findOne(params.id);
 *   if (user.isAdmin) {
 *     throw new ForbiddenException('관리자는 삭제할 수 없습니다');
 *   }
 * }
 * ```
 *
 * @param options 훅 옵션
 */
export function BeforeDelete(
  options: HookDecoratorOptions = {},
): MethodDecorator {
  return createHookDecorator(CrudHookType.BeforeDelete, options);
}

/**
 * @AfterDelete 데코레이터
 *
 * 사용자 삭제 **후**에 실행되는 훅입니다.
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
 *
 * @param options 훅 옵션
 */
export function AfterDelete(
  options: HookDecoratorOptions = {},
): MethodDecorator {
  return createHookDecorator(CrudHookType.AfterDelete, options);
}

// ========================================
// Model 훅
// ========================================

/**
 * @BeforeModelInit 데코레이터
 *
 * 모델 로드 **전**에 실행되는 훅입니다.
 *
 * 사용 예시:
 * ```typescript
 * @BeforeModelInit([CrudOperation.Show, CrudOperation.Update])
 * async beforeShowHook(@ParsedParams() params: any) {
 *   if (!isValidUUID(params.id)) {
 *     throw new BadRequestException('Invalid ID format');
 *   }
 * }
 * ```
 *
 * @param operations 훅이 적용될 작업 (선택적)
 * @param options 훅 옵션
 */
export function BeforeModelInit(
  operations?: CrudOperation[],
  options: Omit<HookDecoratorOptions, 'operations'> = {},
): MethodDecorator {
  return createHookDecorator(CrudHookType.BeforeModelInit, {
    ...options,
    operations,
  });
}

/**
 * @AfterModelInit 데코레이터
 *
 * 모델 로드 **후**에 실행되는 훅입니다.
 *
 * 사용 예시:
 * ```typescript
 * @AfterModelInit([CrudOperation.Index, CrudOperation.Show])
 * async afterLoadHook(@LoadedEntity() entity: User | User[]) {
 *   // 민감 필드 제거
 *   if (Array.isArray(entity)) {
 *     return entity.map(e => this.removeSensitiveFields(e));
 *   }
 *   return this.removeSensitiveFields(entity);
 * }
 * ```
 *
 * @param operations 훅이 적용될 작업 (선택적)
 * @param options 훅 옵션
 */
export function AfterModelInit(
  operations?: CrudOperation[],
  options: Omit<HookDecoratorOptions, 'operations'> = {},
): MethodDecorator {
  return createHookDecorator(CrudHookType.AfterModelInit, {
    ...options,
    operations,
  });
}

// ========================================
// 커스텀 훅
// ========================================

/**
 * @Before 데코레이터
 *
 * 커스텀 함수 실행 **전**에 실행되는 훅입니다.
 *
 * 사용 예시:
 * ```typescript
 * @Before('activateUser')
 * async beforeActivateHook(@ParsedParams() params: any) {
 *   // 활성화 가능 여부 확인
 *   const user = await this.service.findOne(params.id);
 *   if (user.isActive) {
 *     throw new BadRequestException('이미 활성화된 사용자입니다');
 *   }
 * }
 * ```
 *
 * @param functionName 커스텀 함수 이름
 * @param options 훅 옵션
 */
export function Before(
  functionName: string,
  options: HookDecoratorOptions = {},
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudHookMetadataStorage.addHook(target.constructor, {
      type: CrudHookType.BeforeCustom,
      methodName: propertyKey.toString(),
      customFunctionName: functionName,
      priority: options.priority || 0,
    });

    return descriptor;
  };
}

/**
 * @After 데코레이터
 *
 * 커스텀 함수 실행 **후**에 실행되는 훅입니다.
 *
 * 사용 예시:
 * ```typescript
 * @After('activateUser')
 * async afterActivateHook(@UpdatedEntity() user: User) {
 *   await this.emailService.sendActivationConfirmation(user.email);
 * }
 * ```
 *
 * @param functionName 커스텀 함수 이름
 * @param options 훅 옵션
 */
export function After(
  functionName: string,
  options: HookDecoratorOptions = {},
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudHookMetadataStorage.addHook(target.constructor, {
      type: CrudHookType.AfterCustom,
      methodName: propertyKey.toString(),
      customFunctionName: functionName,
      priority: options.priority || 0,
    });

    return descriptor;
  };
}
