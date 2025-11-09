/**
 * 모듈 배럴 export (자동 생성)
 *
 * @description
 * 이 파일은 scripts/generate-module-index.ts에 의해 자동 생성됩니다.
 * 수동으로 수정하지 마세요. 빌드 시 자동으로 재생성됩니다.
 *
 * 생성 명령어:
 * - pnpm generate:modules
 * - pnpm prebuild (빌드 전 자동 실행)
 *
 * 마지막 생성 시간: 2025-11-09T12:39:59.907Z
 */

// Core 모듈
import { HealthModule } from './health/health.module';

// Feature 모듈
import { ProductsModule } from './ex/products.module';

// ========================================
// 개별 모듈 export
// ========================================
export { HealthModule };
export { ProductsModule };

// ========================================
// 모든 모듈 배열
// ========================================
/**
 * 자동으로 탐지된 모든 모듈
 *
 * app.module.ts에서 ...ALL_MODULES로 사용
 */
export const ALL_MODULES = [
  // Core
  HealthModule,

  // Feature
  ProductsModule
];
