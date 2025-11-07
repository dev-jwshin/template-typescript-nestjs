import 'reflect-metadata';
import { CrudConfig, CrudOperation } from '../types';

/**
 * CRUD 메타데이터 저장소
 *
 * Reflect API 기반으로 CRUD 설정 및 훅 메타데이터를 관리합니다.
 * 데코레이터에서 설정한 정보를 저장하고 조회하는 중앙 저장소입니다.
 */
export class CrudMetadataStorage {
  /**
   * CRUD 설정 메타데이터 키
   */
  private static readonly CRUD_CONFIG_KEY = 'crud:config';

  /**
   * 훅 메타데이터 키 prefix
   */
  private static readonly HOOK_PREFIX = 'crud:hook';

  /**
   * CRUD 설정 저장
   *
   * @param target 컨트롤러 클래스
   * @param config CRUD 설정 객체
   */
  static setCrudConfig(target: Function, config: CrudConfig): void {
    Reflect.defineMetadata(this.CRUD_CONFIG_KEY, config, target);
  }

  /**
   * CRUD 설정 조회
   *
   * @param target 컨트롤러 클래스
   * @returns CRUD 설정 객체 또는 undefined
   */
  static getCrudConfig(target: Function): CrudConfig | undefined {
    return Reflect.getMetadata(this.CRUD_CONFIG_KEY, target);
  }

  /**
   * CRUD 설정 존재 여부 확인
   *
   * @param target 컨트롤러 클래스
   * @returns CRUD 설정 존재 여부
   */
  static hasCrudConfig(target: Function): boolean {
    return Reflect.hasMetadata(this.CRUD_CONFIG_KEY, target);
  }

  /**
   * N+1 쿼리 최적화: Eager Loading 설정 추출
   *
   * allowedIncludes를 기반으로 자동 로드할 관계 목록을 반환합니다.
   *
   * @param config CRUD 설정 객체
   * @returns Eager Loading 할 관계 목록
   */
  static getEagerLoadConfig(config: CrudConfig): string[] {
    if (!config.performance?.query?.eagerLoad) {
      return [];
    }
    return config.allowedIncludes || [];
  }

  /**
   * 훅 메타데이터 저장
   *
   * @param target 컨트롤러 클래스 prototype
   * @param propertyKey 메서드 이름
   * @param hookType 훅 타입 (예: 'before:create', 'after:update')
   */
  static setHookMetadata(
    target: any,
    propertyKey: string,
    hookType: string,
  ): void {
    const metadataKey = `${this.HOOK_PREFIX}:${hookType}`;
    Reflect.defineMetadata(metadataKey, propertyKey, target, propertyKey);
  }

  /**
   * 특정 훅 메서드 조회
   *
   * @param target 컨트롤러 인스턴스
   * @param hookType 훅 타입 (예: 'before:create')
   * @returns 훅 메서드 이름 또는 undefined
   */
  static getHookMethod(target: any, hookType: string): string | undefined {
    const metadataKey = `${this.HOOK_PREFIX}:${hookType}`;
    const prototype = Object.getPrototypeOf(target);

    // 모든 메서드를 순회하며 해당 훅 메타데이터를 가진 메서드 찾기
    const methodNames = Object.getOwnPropertyNames(prototype);
    for (const methodName of methodNames) {
      if (Reflect.hasMetadata(metadataKey, prototype, methodName)) {
        return methodName;
      }
    }

    return undefined;
  }

  /**
   * 모든 훅 메서드 조회 (특정 작업)
   *
   * @param target 컨트롤러 인스턴스
   * @param operation CRUD 작업 (예: CrudOperation.Create)
   * @returns { before?: string, after?: string } 훅 메서드 맵
   */
  static getOperationHooks(
    target: any,
    operation: CrudOperation,
  ): { before?: string; after?: string } {
    return {
      before: this.getHookMethod(target, `before:${operation}`),
      after: this.getHookMethod(target, `after:${operation}`),
    };
  }

  /**
   * ModelInit 훅 조회 (특정 작업 리스트 포함)
   *
   * @param target 컨트롤러 인스턴스
   * @param operation CRUD 작업
   * @returns { before?: { method: string, operations: CrudOperation[] }, after?: ... }
   */
  static getModelInitHooks(
    target: any,
    operation: CrudOperation,
  ): {
    before?: { method: string; operations: CrudOperation[] };
    after?: { method: string; operations: CrudOperation[] };
  } {
    const prototype = Object.getPrototypeOf(target);
    const result: any = {};

    // BeforeModelInit 훅 찾기
    const beforeMethod = this.findModelInitHook(
      prototype,
      'before:modelInit',
      operation,
    );
    if (beforeMethod) {
      result.before = beforeMethod;
    }

    // AfterModelInit 훅 찾기
    const afterMethod = this.findModelInitHook(
      prototype,
      'after:modelInit',
      operation,
    );
    if (afterMethod) {
      result.after = afterMethod;
    }

    return result;
  }

  /**
   * ModelInit 훅 찾기 헬퍼 메서드
   */
  private static findModelInitHook(
    prototype: any,
    hookType: string,
    operation: CrudOperation,
  ): { method: string; operations: CrudOperation[] } | undefined {
    const metadataKey = `${this.HOOK_PREFIX}:${hookType}`;
    const methodNames = Object.getOwnPropertyNames(prototype);

    for (const methodName of methodNames) {
      if (Reflect.hasMetadata(metadataKey, prototype, methodName)) {
        const operations: CrudOperation[] = Reflect.getMetadata(
          metadataKey,
          prototype,
          methodName,
        );

        // operations가 비어있으면 모든 작업에 적용
        // 또는 현재 작업이 포함되어 있으면 반환
        if (operations.length === 0 || operations.includes(operation)) {
          return { method: methodName, operations };
        }
      }
    }

    return undefined;
  }

  /**
   * 커스텀 함수 훅 조회
   *
   * @param target 컨트롤러 인스턴스
   * @param functionName 커스텀 함수 이름
   * @returns { before?: string, after?: string }
   */
  static getCustomFunctionHooks(
    target: any,
    functionName: string,
  ): { before?: string; after?: string } {
    return {
      before: this.getHookMethod(target, `before:${functionName}`),
      after: this.getHookMethod(target, `after:${functionName}`),
    };
  }
}
