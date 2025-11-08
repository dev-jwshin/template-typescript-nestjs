/**
 * CRUD 시스템 메인 엔트리포인트
 *
 * 모든 CRUD 관련 모듈을 중앙에서 export합니다.
 */

// 타입
export * from './types';
export * from './types/crud-hook.interface';

// 데코레이터
export * from './decorators';

// 팩토리 (라우트 자동 생성)
export * from './factories';

// 빌더
export * from './builders';

// 서비스
export * from './services';
export * from './services/crud-hook-executor.service';

// 메타데이터
export * from './metadata';
export * from './metadata/crud-hook-metadata.storage';

// 인터셉터
export * from './interceptors';

// 플러그인
export * from './plugins';
