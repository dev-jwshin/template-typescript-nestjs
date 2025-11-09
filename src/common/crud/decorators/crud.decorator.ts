import { CrudConfig } from '../types';
import { CrudMetadataStorage } from '../metadata';
import { CrudConfigMetadataStorage } from '../metadata/crud-config-metadata.storage';
import { CrudRouteFactory } from '../factories/crud-route.factory';

/**
 * @Crud 데코레이터
 *
 * 클래스 데코레이터로 CRUD 엔드포인트를 자동 생성합니다.
 * 메타데이터를 저장하고 즉시 라우트를 생성합니다.
 *
 * 사용 예시:
 * ```typescript
 * @Crud({
 *   only: [CrudOperation.Index, CrudOperation.Show, CrudOperation.Create],
 *   resourceType: 'users',
 *   allowedIncludes: ['profile', 'roles'],
 *   performance: {
 *     query: { eagerLoad: true } // N+1 쿼리 자동 최적화
 *   }
 * })
 * @Controller('users')
 * export class UsersController {
 *   constructor(private readonly usersService: UsersService) {}
 * }
 * ```
 *
 * 자동 생성되는 엔드포인트:
 * - Index: GET /users (목록 조회)
 * - Show: GET /users/:id (단일 조회)
 * - Create: POST /users (생성)
 * - Update: PATCH /users/:id (수정)
 * - Delete: DELETE /users/:id (삭제)
 *
 * @param config CRUD 설정 객체
 * @returns ClassDecorator
 */
export function Crud(config: CrudConfig): ClassDecorator {
  return function (target: Function) {
    // 1. 메타데이터 저장 (기존 저장소)
    CrudMetadataStorage.setCrudConfig(target, config);

    // 2. CrudConfig 메타데이터 저장 (Service 주입용) ⭐ 신규
    CrudConfigMetadataStorage.set(target, config);

    // 2. 플러그인 초기화
    if (config.plugins && config.plugins.length > 0) {
      config.plugins.forEach((plugin) => {
        if (plugin.init) {
          plugin.init(config);
        }
      });
    }

    // 3. 라우트 자동 생성 ⭐ 핵심 기능
    CrudRouteFactory.generateRoutes(target, config);

    // 4. 디버그 로그 (개발 환경)
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[Crud Decorator] Applied to: ${target.name}`,
        `\n  - Resource Type: ${config.resourceType || 'N/A'}`,
        `\n  - Operations: ${config.only.join(', ')}`,
        `\n  - Auto-generated Routes: ${config.only.length}`,
        `\n  - Eager Load: ${config.performance?.query?.eagerLoad ? 'Enabled' : 'Disabled'}`,
      );
    }
  };
}
