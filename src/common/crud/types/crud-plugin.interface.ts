import { CrudConfig } from './crud-config.interface';
import { CrudOperation } from './crud-operation.enum';

/**
 * CRUD 플러그인 인터페이스
 *
 * 재사용 가능한 기능을 플러그인으로 패키징합니다.
 * 예: 감사 로그, 캐싱, Rate Limiting 등
 */
export interface CrudPlugin {
  /**
   * 플러그인 이름
   */
  name: string;

  /**
   * 플러그인 버전 (Semantic Versioning)
   */
  version: string;

  /**
   * 플러그인 초기화 함수 (선택)
   *
   * CRUD 설정이 로드될 때 한 번 실행됩니다.
   */
  init?(config: CrudConfig): void;

  /**
   * 훅 등록 함수 (선택)
   *
   * CRUD 작업 전후에 실행될 훅을 등록합니다.
   */
  registerHooks?(): {
    before?: Partial<Record<CrudOperation, Function>>;
    after?: Partial<Record<CrudOperation, Function>>;
  };

  /**
   * 커스텀 데코레이터 등록 (선택)
   *
   * 플러그인에서 제공하는 데코레이터를 등록합니다.
   */
  registerDecorators?(): MethodDecorator[];

  /**
   * 미들웨어 등록 (선택)
   *
   * 플러그인에서 제공하는 미들웨어를 등록합니다.
   */
  registerMiddleware?(): any[];
}
