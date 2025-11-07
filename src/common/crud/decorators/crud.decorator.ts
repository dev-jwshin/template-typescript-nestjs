import { CrudConfig } from '../types';
import { CrudMetadataStorage } from '../metadata';

/**
 * @Crud 데코레이터
 *
 * 클래스 데코레이터로 CRUD 엔드포인트를 자동 생성합니다.
 * 메타데이터를 저장하고 런타임에 라우트를 생성합니다.
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
 * @param config CRUD 설정 객체
 * @returns ClassDecorator
 */
export function Crud(config: CrudConfig): ClassDecorator {
  return function (target: Function) {
    // 1. 메타데이터 저장
    CrudMetadataStorage.setCrudConfig(target, config);

    // 2. 플러그인 초기화
    if (config.plugins && config.plugins.length > 0) {
      config.plugins.forEach((plugin) => {
        if (plugin.init) {
          plugin.init(config);
        }
      });
    }

    // 3. 디버그 로그 (개발 환경)
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[Crud Decorator] Applied to: ${target.name}`,
        `\n  - Resource Type: ${config.resourceType || 'N/A'}`,
        `\n  - Operations: ${config.only.join(', ')}`,
        `\n  - Eager Load: ${config.performance?.query?.eagerLoad ? 'Enabled' : 'Disabled'}`,
      );
    }

    // 4. 라우트 생성은 CrudModule에서 처리됨
    // (OnModuleInit 라이프사이클에서 실행)
  };
}
