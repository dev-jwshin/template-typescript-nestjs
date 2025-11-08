import { CrudOperation } from './crud-operation.enum';

/**
 * CRUD 훅 타입
 *
 * CRUD 작업의 전후에 실행되는 훅의 종류를 정의합니다.
 */
export enum CrudHookType {
  // Create 훅
  BeforeCreate = 'before:create',
  AfterCreate = 'after:create',

  // Update 훅
  BeforeUpdate = 'before:update',
  AfterUpdate = 'after:update',

  // Delete 훅
  BeforeDelete = 'before:delete',
  AfterDelete = 'after:delete',

  // Model 훅
  BeforeModelInit = 'before:model-init',
  AfterModelInit = 'after:model-init',

  // 커스텀 훅
  BeforeCustom = 'before:custom',
  AfterCustom = 'after:custom',
}

/**
 * 훅 실행 컨텍스트
 *
 * 훅 메서드에 전달되는 실행 컨텍스트 정보입니다.
 */
export interface CrudHookContext {
  /**
   * 실행 중인 CRUD 작업
   */
  operation: CrudOperation;

  /**
   * 요청 객체 (Express Request)
   */
  request?: any;

  /**
   * 현재 사용자 (인증된 경우)
   */
  user?: any;

  /**
   * 클라이언트 IP 주소
   */
  ip?: string;

  /**
   * 요청 헤더
   */
  headers?: Record<string, string>;

  /**
   * 추가 메타데이터
   */
  metadata?: Record<string, any>;
}

/**
 * 훅 메타데이터
 *
 * 데코레이터에서 저장하는 훅 정보입니다.
 */
export interface CrudHookMetadata {
  /**
   * 훅 타입
   */
  type: CrudHookType;

  /**
   * 훅 메서드 이름
   */
  methodName: string;

  /**
   * 훅이 적용되는 CRUD 작업 (선택적)
   * 지정하지 않으면 모든 작업에 적용
   */
  operations?: CrudOperation[];

  /**
   * 훅 우선순위 (낮을수록 먼저 실행)
   */
  priority?: number;

  /**
   * 커스텀 함수 이름 (커스텀 훅인 경우)
   */
  customFunctionName?: string;
}

/**
 * 훅 실행 결과
 */
export interface CrudHookResult<T = any> {
  /**
   * 변환된 데이터
   */
  data: T;

  /**
   * 훅 실행 중 발생한 메타데이터
   */
  metadata?: Record<string, any>;

  /**
   * 후속 훅 실행 중단 여부
   */
  stopPropagation?: boolean;
}
