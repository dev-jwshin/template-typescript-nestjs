import { CrudConfig } from '../types/crud-config.interface';
import { CrudOperation } from '../types/crud-operation.enum';
import { CrudHookContext } from '../types/crud-hook.interface';

/**
 * CRUD 플러그인 인터페이스
 *
 * 재사용 가능한 CRUD 기능을 플러그인으로 패키징합니다.
 */
export interface CrudPlugin {
  /**
   * 플러그인 이름
   */
  name: string;

  /**
   * 플러그인 버전
   */
  version: string;

  /**
   * 플러그인 설명 (선택적)
   */
  description?: string;

  /**
   * 플러그인 초기화
   *
   * @Crud 데코레이터 적용 시 호출됩니다.
   *
   * @param config CRUD 설정
   */
  init?(config: CrudConfig): void;

  /**
   * 훅 등록
   *
   * 플러그인이 제공하는 훅을 등록합니다.
   *
   * @returns 훅 맵 (작업별 Before/After 훅)
   */
  registerHooks?(): CrudPluginHooks;

  /**
   * 데코레이터 등록
   *
   * 플러그인이 제공하는 데코레이터를 등록합니다.
   *
   * @returns 메서드 데코레이터 배열
   */
  registerDecorators?(): MethodDecorator[];

  /**
   * 미들웨어 등록
   *
   * 플러그인이 제공하는 미들웨어를 등록합니다.
   *
   * @returns 미들웨어 배열
   */
  registerMiddleware?(): any[];

  /**
   * 플러그인 정리
   *
   * 애플리케이션 종료 시 호출됩니다.
   */
  destroy?(): void | Promise<void>;
}

/**
 * 플러그인 훅 맵
 */
export interface CrudPluginHooks {
  /**
   * Before 훅 (작업 전)
   */
  before?: Partial<Record<CrudOperation, CrudPluginHookFunction>>;

  /**
   * After 훅 (작업 후)
   */
  after?: Partial<Record<CrudOperation, CrudPluginHookFunction>>;
}

/**
 * 플러그인 훅 함수 타입
 */
export type CrudPluginHookFunction = (
  data: any,
  context: CrudHookContext,
) => any | Promise<any>;

/**
 * 플러그인 옵션
 */
export interface CrudPluginOptions {
  /**
   * 플러그인 활성화 여부
   */
  enabled?: boolean;

  /**
   * 플러그인 우선순위 (낮을수록 먼저 실행)
   */
  priority?: number;

  /**
   * 플러그인 설정
   */
  config?: Record<string, any>;
}
