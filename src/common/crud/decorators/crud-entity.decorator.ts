import 'reflect-metadata';
import type { CrudEntityConfig } from '../types/crud-entity-config.interface';

/**
 * Entity 메타데이터 저장 키
 */
const CRUD_ENTITY_METADATA_KEY = Symbol('crud:entity');

/**
 * @CrudEntity 데코레이터
 *
 * Entity 클래스에 CRUD 설정을 메타데이터로 저장합니다.
 * 이를 통해 Service 레이어에서 super() 호출 시 config 전달을 생략할 수 있습니다.
 *
 * @param config CRUD 설정 객체
 *
 * @example
 * ```typescript
 * import { CrudEntity } from '../../../common/crud';
 *
 * @CrudEntity({
 *   modelName: 'comment',
 *   serialize: {
 *     exclude: ['authorEmail', 'authorIp'],
 *   },
 * })
 * export class Comment {
 *   id: string;
 *   content: string;
 *   authorEmail: string;  // 응답에서 제외됨
 *   authorIp: string;     // 응답에서 제외됨
 * }
 * ```
 */
export function CrudEntity(config: CrudEntityConfig): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(CRUD_ENTITY_METADATA_KEY, config, target);
  };
}

/**
 * Entity 클래스에서 @CrudEntity 메타데이터 가져오기
 *
 * @param target Entity 클래스 또는 인스턴스
 * @returns CrudEntityConfig 또는 undefined
 */
export function getCrudEntityMetadata(target: any): CrudEntityConfig | undefined {
  const ctor = target?.prototype ? target : target?.constructor;
  if (!ctor) return undefined;

  return Reflect.getMetadata(CRUD_ENTITY_METADATA_KEY, ctor);
}
