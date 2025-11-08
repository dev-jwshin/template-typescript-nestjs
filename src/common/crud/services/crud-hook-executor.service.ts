import { Injectable, Logger } from '@nestjs/common';
import { CrudHookMetadata, CrudHookContext } from '../types/crud-hook.interface';
import { CrudOperation } from '../types/crud-operation.enum';
import { CrudHookMetadataStorage } from '../metadata/crud-hook-metadata.storage';

/**
 * CRUD 훅 실행기
 *
 * 훅 메타데이터를 기반으로 훅 메서드를 순차적으로 실행합니다.
 */
@Injectable()
export class CrudHookExecutor {
  private readonly logger = new Logger(CrudHookExecutor.name);

  /**
   * Before 훅 실행
   *
   * @param controllerInstance 컨트롤러 인스턴스
   * @param operation CRUD 작업
   * @param context 실행 컨텍스트
   * @param data 전달될 데이터
   * @returns 변환된 데이터
   */
  async executeBeforeHooks(
    controllerInstance: any,
    operation: CrudOperation,
    context: CrudHookContext,
    data: any,
  ): Promise<any> {
    const hooks = CrudHookMetadataStorage.getBeforeHooks(
      controllerInstance.constructor,
      operation,
    );

    if (hooks.length === 0) {
      return data;
    }

    this.logger.debug(
      `Executing ${hooks.length} before hooks for ${operation}`,
    );

    let transformedData = data;

    for (const hook of hooks) {
      try {
        const result = await this.executeHook(
          controllerInstance,
          hook,
          context,
          transformedData,
        );

        // 훅이 데이터를 반환하면 변환된 데이터로 업데이트
        if (result !== undefined) {
          transformedData = result;
        }
      } catch (error) {
        this.logger.error(
          `Error executing before hook ${hook.methodName}:`,
          error,
        );
        throw error;
      }
    }

    return transformedData;
  }

  /**
   * After 훅 실행
   *
   * @param controllerInstance 컨트롤러 인스턴스
   * @param operation CRUD 작업
   * @param context 실행 컨텍스트
   * @param data 전달될 데이터 (엔티티)
   * @returns 변환된 데이터
   */
  async executeAfterHooks(
    controllerInstance: any,
    operation: CrudOperation,
    context: CrudHookContext,
    data: any,
  ): Promise<any> {
    const hooks = CrudHookMetadataStorage.getAfterHooks(
      controllerInstance.constructor,
      operation,
    );

    if (hooks.length === 0) {
      return data;
    }

    this.logger.debug(
      `Executing ${hooks.length} after hooks for ${operation}`,
    );

    let transformedData = data;

    for (const hook of hooks) {
      try {
        const result = await this.executeHook(
          controllerInstance,
          hook,
          context,
          transformedData,
        );

        // 훅이 데이터를 반환하면 변환된 데이터로 업데이트
        if (result !== undefined) {
          transformedData = result;
        }
      } catch (error) {
        this.logger.error(
          `Error executing after hook ${hook.methodName}:`,
          error,
        );
        throw error;
      }
    }

    return transformedData;
  }

  /**
   * 커스텀 훅 실행
   *
   * @param controllerInstance 컨트롤러 인스턴스
   * @param functionName 커스텀 함수 이름
   * @param isBefore Before 훅 여부
   * @param context 실행 컨텍스트
   * @param data 전달될 데이터
   * @returns 변환된 데이터
   */
  async executeCustomHooks(
    controllerInstance: any,
    functionName: string,
    isBefore: boolean,
    context: CrudHookContext,
    data: any,
  ): Promise<any> {
    const hooks = CrudHookMetadataStorage.getCustomHooks(
      controllerInstance.constructor,
      functionName,
      isBefore,
    );

    if (hooks.length === 0) {
      return data;
    }

    this.logger.debug(
      `Executing ${hooks.length} ${isBefore ? 'before' : 'after'} hooks for custom function ${functionName}`,
    );

    let transformedData = data;

    for (const hook of hooks) {
      try {
        const result = await this.executeHook(
          controllerInstance,
          hook,
          context,
          transformedData,
        );

        if (result !== undefined) {
          transformedData = result;
        }
      } catch (error) {
        this.logger.error(
          `Error executing custom hook ${hook.methodName}:`,
          error,
        );
        throw error;
      }
    }

    return transformedData;
  }

  /**
   * 단일 훅 실행
   *
   * @param controllerInstance 컨트롤러 인스턴스
   * @param hook 훅 메타데이터
   * @param context 실행 컨텍스트
   * @param data 전달될 데이터
   * @returns 훅 실행 결과
   */
  private async executeHook(
    controllerInstance: any,
    hook: CrudHookMetadata,
    context: CrudHookContext,
    data: any,
  ): Promise<any> {
    const method = controllerInstance[hook.methodName];

    if (typeof method !== 'function') {
      this.logger.warn(
        `Hook method ${hook.methodName} not found on controller`,
      );
      return data;
    }

    // 훅 메서드 호출
    // 파라미터 데코레이터는 NestJS가 자동으로 처리하므로
    // 여기서는 request 객체를 설정만 해주면 됩니다
    const result = await method.call(controllerInstance);

    return result;
  }
}
