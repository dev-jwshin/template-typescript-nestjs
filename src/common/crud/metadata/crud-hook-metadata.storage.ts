import { CrudHookMetadata, CrudHookType } from '../types/crud-hook.interface';
import { CrudOperation } from '../types/crud-operation.enum';

/**
 * CRUD 훅 메타데이터 저장소
 *
 * 컨트롤러의 훅 메타데이터를 저장하고 조회합니다.
 */
export class CrudHookMetadataStorage {
  /**
   * 훅 메타데이터 맵
   * Key: Controller class
   * Value: 훅 메타데이터 배열
   */
  private static hooks = new Map<Function, CrudHookMetadata[]>();

  /**
   * 훅 메타데이터 저장
   *
   * @param target Controller 클래스
   * @param metadata 훅 메타데이터
   */
  static addHook(target: Function, metadata: CrudHookMetadata): void {
    const existing = this.hooks.get(target) || [];
    existing.push(metadata);
    this.hooks.set(target, existing);
  }

  /**
   * 특정 컨트롤러의 모든 훅 조회
   *
   * @param target Controller 클래스
   * @returns 훅 메타데이터 배열
   */
  static getHooks(target: Function): CrudHookMetadata[] {
    return this.hooks.get(target) || [];
  }

  /**
   * 특정 타입의 훅 조회
   *
   * @param target Controller 클래스
   * @param type 훅 타입
   * @returns 훅 메타데이터 배열
   */
  static getHooksByType(
    target: Function,
    type: CrudHookType,
  ): CrudHookMetadata[] {
    const hooks = this.getHooks(target);
    return hooks
      .filter((hook) => hook.type === type)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  /**
   * 특정 작업에 해당하는 훅 조회
   *
   * @param target Controller 클래스
   * @param type 훅 타입
   * @param operation CRUD 작업
   * @returns 훅 메타데이터 배열
   */
  static getHooksForOperation(
    target: Function,
    type: CrudHookType,
    operation: CrudOperation,
  ): CrudHookMetadata[] {
    const hooks = this.getHooksByType(target, type);
    return hooks.filter(
      (hook) =>
        !hook.operations || hook.operations.includes(operation),
    );
  }

  /**
   * Before 훅 조회 (작업 전)
   *
   * @param target Controller 클래스
   * @param operation CRUD 작업
   * @returns 훅 메타데이터 배열
   */
  static getBeforeHooks(
    target: Function,
    operation: CrudOperation,
  ): CrudHookMetadata[] {
    const typeMap: Record<CrudOperation, CrudHookType> = {
      [CrudOperation.Index]: CrudHookType.BeforeModelInit,
      [CrudOperation.Show]: CrudHookType.BeforeModelInit,
      [CrudOperation.Create]: CrudHookType.BeforeCreate,
      [CrudOperation.Update]: CrudHookType.BeforeUpdate,
      [CrudOperation.Delete]: CrudHookType.BeforeDelete,
    };

    const hookType = typeMap[operation];
    if (!hookType) return [];

    return this.getHooksForOperation(target, hookType, operation);
  }

  /**
   * After 훅 조회 (작업 후)
   *
   * @param target Controller 클래스
   * @param operation CRUD 작업
   * @returns 훅 메타데이터 배열
   */
  static getAfterHooks(
    target: Function,
    operation: CrudOperation,
  ): CrudHookMetadata[] {
    const typeMap: Record<CrudOperation, CrudHookType> = {
      [CrudOperation.Index]: CrudHookType.AfterModelInit,
      [CrudOperation.Show]: CrudHookType.AfterModelInit,
      [CrudOperation.Create]: CrudHookType.AfterCreate,
      [CrudOperation.Update]: CrudHookType.AfterUpdate,
      [CrudOperation.Delete]: CrudHookType.AfterDelete,
    };

    const hookType = typeMap[operation];
    if (!hookType) return [];

    return this.getHooksForOperation(target, hookType, operation);
  }

  /**
   * 커스텀 함수 훅 조회
   *
   * @param target Controller 클래스
   * @param functionName 커스텀 함수 이름
   * @param isBefore Before 훅 여부
   * @returns 훅 메타데이터 배열
   */
  static getCustomHooks(
    target: Function,
    functionName: string,
    isBefore: boolean,
  ): CrudHookMetadata[] {
    const type = isBefore
      ? CrudHookType.BeforeCustom
      : CrudHookType.AfterCustom;
    const hooks = this.getHooksByType(target, type);
    return hooks.filter(
      (hook) => hook.customFunctionName === functionName,
    );
  }

  /**
   * 모든 훅 제거 (테스트용)
   */
  static clear(): void {
    this.hooks.clear();
  }
}
