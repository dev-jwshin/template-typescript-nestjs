import { Provider, Type } from '@nestjs/common';
import { CRUD_CONFIG } from '../constants/crud-config.token';
import { CrudConfigMetadataStorage } from '../metadata/crud-config-metadata.storage';
import { CrudConfig } from '../types/crud-config.interface';

/**
 * CrudConfig Provider 팩토리
 *
 * @description
 * Controller에서 정의한 CrudConfig를 Service에 주입하기 위한 Provider를 생성합니다.
 *
 * 동작 원리:
 * 1. @Crud 데코레이터가 CrudConfigMetadataStorage에 설정 저장
 * 2. Module에서 이 Provider를 등록
 * 3. Service 생성 시 저장된 설정을 조회하여 주입
 *
 * @param controllerClass Controller 클래스 (설정을 정의한 곳)
 * @returns NestJS Provider
 *
 * @example
 * ```typescript
 * // products.module.ts
 * import { createCrudConfigProvider } from '../../common/crud/providers/crud-config.provider';
 * import { ProductsController } from './api/products.controller';
 *
 * @Module({
 *   controllers: [ProductsController],
 *   providers: [
 *     ProductsService,
 *     createCrudConfigProvider(ProductsController), // ← Provider 추가
 *   ],
 * })
 * export class ProductsModule {}
 * ```
 *
 * @throws Error - Controller에 @Crud 데코레이터가 적용되지 않은 경우
 */
export function createCrudConfigProvider(controllerClass: Type<any>): Provider {
  return {
    provide: CRUD_CONFIG,
    useFactory: (): CrudConfig => {
      // Controller에서 정의한 CrudConfig 조회
      const config = CrudConfigMetadataStorage.get(controllerClass);

      if (!config) {
        throw new Error(
          `[CrudConfigProvider] ${controllerClass.name}에 @Crud 데코레이터가 적용되지 않았습니다. ` +
            `Controller에 @Crud 데코레이터를 추가하세요.`,
        );
      }

      // Serializer가 Class인 경우 인스턴스 생성
      if (config.serializer && typeof config.serializer === 'function') {
        config.serializer = new config.serializer();
      }

      return config;
    },
  };
}

/**
 * 여러 Controller의 CrudConfig Provider 생성
 *
 * @description
 * 하나의 모듈에 여러 Controller가 있는 경우 (예: api/, admin/)
 * 각 Controller마다 Provider를 생성합니다.
 *
 * 주의사항:
 * - 여러 Controller가 같은 Service를 공유하는 경우,
 *   마지막 Provider의 설정이 사용됩니다.
 * - 권장: Controller마다 별도의 Service 사용
 *
 * @param controllerClasses Controller 클래스 배열
 * @returns NestJS Provider 배열
 *
 * @example
 * ```typescript
 * // 여러 Controller가 있는 경우
 * @Module({
 *   controllers: [ProductsController, AdminProductsController],
 *   providers: [
 *     ProductsService,
 *     ...createMultipleCrudConfigProviders([
 *       ProductsController,
 *       AdminProductsController,
 *     ]),
 *   ],
 * })
 * export class ProductsModule {}
 * ```
 */
export function createMultipleCrudConfigProviders(
  controllerClasses: Type<any>[],
): Provider[] {
  return controllerClasses.map((controllerClass) =>
    createCrudConfigProvider(controllerClass),
  );
}
