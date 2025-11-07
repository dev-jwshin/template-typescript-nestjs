import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CrudMetadataStorage } from '../metadata';
import { CrudOperation, CrudRequest } from '../types';

// ========================================
// 훅 데코레이터 (Hook Decorators)
// ========================================

/**
 * Create 작업 전에 실행되는 훅 데코레이터
 *
 * 실행 시점: 데이터베이스에 저장되기 직전
 *
 * 용도:
 * - DTO 검증 및 전처리
 * - 비밀번호 해싱
 * - 타임스탬프 자동 설정
 * - 중복 데이터 체크
 *
 * 사용 예시:
 * ```typescript
 * @BeforeCreate()
 * async beforeCreate(@ParsedBody() dto: CreateUserDto) {
 *   dto.password = await hash(dto.password);
 *   return dto;
 * }
 * ```
 */
export function BeforeCreate(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudMetadataStorage.setHookMetadata(target, String(propertyKey), 'before:create');
  };
}

/**
 * Create 작업 후에 실행되는 훅 데코레이터
 *
 * 실행 시점: 데이터베이스에 저장된 직후
 *
 * 용도:
 * - 환영 이메일 발송
 * - 이벤트 발행
 * - 감사 로그 기록
 * - 캐시 갱신
 */
export function AfterCreate(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudMetadataStorage.setHookMetadata(target, String(propertyKey), 'after:create');
  };
}

/**
 * Update 작업 전에 실행되는 훅 데코레이터
 *
 * 실행 시점: 데이터베이스에 업데이트되기 직전
 *
 * 용도:
 * - 권한 검증
 * - 변경 내역 검증
 * - 타임스탬프 갱신
 */
export function BeforeUpdate(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudMetadataStorage.setHookMetadata(target, String(propertyKey), 'before:update');
  };
}

/**
 * Update 작업 후에 실행되는 훅 데코레이터
 *
 * 실행 시점: 데이터베이스에 업데이트된 직후
 *
 * 용도:
 * - 캐시 무효화
 * - 변경 이벤트 발행
 * - 알림 전송
 */
export function AfterUpdate(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudMetadataStorage.setHookMetadata(target, String(propertyKey), 'after:update');
  };
}

/**
 * Delete 작업 전에 실행되는 훅 데코레이터
 *
 * 실행 시점: 데이터베이스에서 삭제되기 직전
 *
 * 용도:
 * - 삭제 가능 여부 검증
 * - 연관 데이터 정리
 * - 백업 생성
 */
export function BeforeDelete(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudMetadataStorage.setHookMetadata(target, String(propertyKey), 'before:delete');
  };
}

/**
 * Delete 작업 후에 실행되는 훅 데코레이터
 *
 * 실행 시점: 데이터베이스에서 삭제된 직후
 *
 * 용도:
 * - 감사 로그 기록
 * - 삭제 이벤트 발행
 * - 관련 캐시 정리
 */
export function AfterDelete(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudMetadataStorage.setHookMetadata(target, String(propertyKey), 'after:delete');
  };
}

/**
 * Model 초기화 전에 실행되는 훅 데코레이터
 *
 * 실행 시점: DTO가 모델로 매핑되기 전 또는 DB에서 로드되기 전
 *
 * 용도:
 * - ID 포맷 검증
 * - 존재 여부 사전 체크
 * - 접근 권한 검증
 *
 * @param operations 이 훅을 적용할 작업 목록 (선택, 기본: 모든 작업)
 *
 * 사용 예시:
 * ```typescript
 * @BeforeModelInit([CrudOperation.Show, CrudOperation.Update])
 * async beforeModelInit(@ParsedParams() params: any) {
 *   if (!isValidUUID(params.id)) {
 *     throw new BadRequestException('Invalid ID format');
 *   }
 * }
 * ```
 */
export function BeforeModelInit(operations?: CrudOperation[]): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudMetadataStorage.setHookMetadata(
      target,
      String(propertyKey),
      'before:modelInit',
    );
    // operations 배열도 메타데이터로 저장
    Reflect.defineMetadata(
      'crud:hook:before:modelInit',
      operations || [],
      target,
      propertyKey,
    );
  };
}

/**
 * Model 초기화 후에 실행되는 훅 데코레이터
 *
 * 실행 시점: DTO가 모델로 매핑된 후 또는 DB에서 로드된 후
 *
 * 용도:
 * - 민감한 필드 제거
 * - 추가 필드 계산
 * - 데이터 변환
 *
 * @param operations 이 훅을 적용할 작업 목록 (선택, 기본: 모든 작업)
 */
export function AfterModelInit(operations?: CrudOperation[]): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudMetadataStorage.setHookMetadata(
      target,
      String(propertyKey),
      'after:modelInit',
    );
    Reflect.defineMetadata(
      'crud:hook:after:modelInit',
      operations || [],
      target,
      propertyKey,
    );
  };
}

/**
 * 특정 커스텀 함수 실행 전에 실행되는 훅 데코레이터
 *
 * 용도:
 * - 커스텀 엔드포인트의 전처리
 * - 권한 검증
 * - 입력값 검증
 *
 * @param functionName 대상 함수 이름
 *
 * 사용 예시:
 * ```typescript
 * @Before('activateUser')
 * async beforeActivate(@ParsedParams() params: any) {
 *   // activateUser 함수 실행 전 검증 로직
 * }
 * ```
 */
export function Before(functionName: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudMetadataStorage.setHookMetadata(
      target,
      String(propertyKey),
      `before:${functionName}`,
    );
  };
}

/**
 * 특정 커스텀 함수 실행 후에 실행되는 훅 데코레이터
 *
 * 용도:
 * - 커스텀 엔드포인트의 후처리
 * - 이벤트 발행
 * - 알림 전송
 *
 * @param functionName 대상 함수 이름
 */
export function After(functionName: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    CrudMetadataStorage.setHookMetadata(
      target,
      String(propertyKey),
      `after:${functionName}`,
    );
  };
}

// ========================================
// 파라미터 데코레이터 (Parameter Decorators)
// ========================================

/**
 * 생성된 엔티티를 추출하는 데코레이터
 *
 * @AfterCreate 훅에서 사용합니다.
 * 데이터베이스에 저장된 최종 엔티티를 제공합니다.
 *
 * 사용 예시:
 * ```typescript
 * @AfterCreate()
 * async afterCreate(@CreatedEntity() user: User) {
 *   // user는 데이터베이스에 저장된 엔티티입니다.
 * }
 * ```
 */
export const CreatedEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.createdEntity; // CRUD 라이브러리에서 설정됨
  },
);

/**
 * 수정된 엔티티를 추출하는 데코레이터
 *
 * @AfterUpdate 훅에서 사용합니다.
 * 수정 작업 후 최종 엔티티를 제공합니다.
 */
export const UpdatedEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.updatedEntity;
  },
);

/**
 * 삭제된 엔티티를 추출하는 데코레이터
 *
 * @AfterDelete 훅에서 사용합니다.
 * 삭제되기 전 엔티티 정보를 제공합니다.
 */
export const DeletedEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.deletedEntity;
  },
);

/**
 * 로드된 엔티티를 추출하는 데코레이터
 *
 * @AfterModelInit 훅에서 사용합니다.
 * Show, Index 작업에서 로드된 엔티티를 제공합니다.
 * 단일 엔티티 또는 배열을 반환합니다.
 */
export const LoadedEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.loadedEntity;
  },
);

/**
 * 파싱된 요청 본문을 추출하는 데코레이터
 *
 * 모든 훅에서 사용 가능합니다.
 * DTO로 변환된 요청 본문을 제공합니다.
 */
export const ParsedBody = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.body;
  },
);

/**
 * 파싱된 경로 파라미터를 추출하는 데코레이터
 *
 * 모든 훅에서 사용 가능합니다.
 * URL 파라미터를 제공합니다.
 */
export const ParsedParams = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.params;
  },
);

/**
 * CRUD 요청 컨텍스트를 추출하는 데코레이터
 *
 * 모든 훅에서 사용 가능합니다.
 * 파싱된 쿼리, 필터, 정렬 등의 정보를 제공합니다.
 */
export const ParsedRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      req: request,
      parsed: request.crudParsed || {},
      user: request.user,
      ip: request.ip,
      headers: request.headers,
    } as CrudRequest;
  },
);
