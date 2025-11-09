#!/usr/bin/env ts-node

/**
 * 모듈 인덱스 자동 생성 스크립트
 *
 * @description
 * src/modules/ 디렉토리의 모든 *.module.ts 파일을 자동으로 찾아
 * src/modules/index.ts 파일을 생성합니다.
 *
 * 실행 방법:
 * - pnpm generate:modules
 * - pnpm prebuild (빌드 전 자동 실행)
 *
 * @example
 * ```bash
 * pnpm generate:modules
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 모듈 디렉토리 경로
 */
const MODULES_DIR = path.join(__dirname, '../src/modules');

/**
 * 생성할 인덱스 파일 경로
 */
const INDEX_FILE = path.join(MODULES_DIR, 'index.ts');

/**
 * 제외할 디렉토리
 */
const EXCLUDED_DIRS = ['test', 'dto', 'interfaces', 'api', 'admin'];

/**
 * 모듈 정보 인터페이스
 */
interface ModuleInfo {
  name: string; // 모듈 클래스명 (예: UsersModule)
  path: string; // 상대 경로 (예: ./users/users.module)
  category: 'core' | 'feature'; // 카테고리
}

/**
 * 디렉토리를 재귀적으로 탐색하여 *.module.ts 파일을 찾습니다.
 */
function findModuleFiles(dir: string, baseDir: string = dir): ModuleInfo[] {
  const modules: ModuleInfo[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // 제외할 디렉토리 스킵
      if (entry.isDirectory() && EXCLUDED_DIRS.includes(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        // 재귀적으로 탐색
        modules.push(...findModuleFiles(fullPath, baseDir));
      } else if (entry.isFile() && entry.name.endsWith('.module.ts')) {
        // *.module.ts 파일 발견
        const relativePath = path.relative(baseDir, fullPath);
        const modulePathWithoutExt = relativePath.replace(/\.ts$/, '');

        // 모듈 클래스명 추출 (예: users.module.ts → UsersModule)
        const moduleName = extractModuleName(entry.name);

        // 카테고리 결정 (health는 core, 나머지는 feature)
        const category = entry.name === 'health.module.ts' ? 'core' : 'feature';

        modules.push({
          name: moduleName,
          path: `./${modulePathWithoutExt.replace(/\\/g, '/')}`,
          category,
        });
      }
    }
  } catch (error) {
    console.error(`디렉토리 읽기 실패: ${dir}`, error);
  }

  return modules;
}

/**
 * 파일명에서 모듈 클래스명 추출
 *
 * @example
 * users.module.ts → UsersModule
 * health.module.ts → HealthModule
 */
function extractModuleName(filename: string): string {
  // users.module.ts → users
  const baseName = filename.replace('.module.ts', '');

  // users → Users
  const capitalizedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  // Users → UsersModule
  return `${capitalizedName}Module`;
}

/**
 * index.ts 파일 내용 생성
 */
function generateIndexContent(modules: ModuleInfo[]): string {
  const coreModules = modules.filter((m) => m.category === 'core');
  const featureModules = modules.filter((m) => m.category === 'feature');

  const lines: string[] = [
    '/**',
    ' * 모듈 배럴 export (자동 생성)',
    ' *',
    ' * @description',
    ' * 이 파일은 scripts/generate-module-index.ts에 의해 자동 생성됩니다.',
    ' * 수동으로 수정하지 마세요. 빌드 시 자동으로 재생성됩니다.',
    ' *',
    ' * 생성 명령어:',
    ' * - pnpm generate:modules',
    ' * - pnpm prebuild (빌드 전 자동 실행)',
    ' *',
    ` * 마지막 생성 시간: ${new Date().toISOString()}`,
    ' */',
    '',
  ];

  // import 문 생성
  const allModules = [...coreModules, ...featureModules];

  if (coreModules.length > 0) {
    lines.push('// Core 모듈');
    coreModules.forEach((module) => {
      lines.push(`import { ${module.name} } from '${module.path}';`);
    });
    lines.push('');
  }

  if (featureModules.length > 0) {
    lines.push('// Feature 모듈');
    featureModules.forEach((module) => {
      lines.push(`import { ${module.name} } from '${module.path}';`);
    });
    lines.push('');
  }

  // export 문 생성
  lines.push('// ========================================');
  lines.push('// 개별 모듈 export');
  lines.push('// ========================================');
  allModules.forEach((module) => {
    lines.push(`export { ${module.name} };`);
  });
  lines.push('');

  // 모듈 배열 export
  lines.push('// ========================================');
  lines.push('// 모든 모듈 배열');
  lines.push('// ========================================');
  lines.push('/**');
  lines.push(' * 자동으로 탐지된 모든 모듈');
  lines.push(' *');
  lines.push(' * app.module.ts에서 ...ALL_MODULES로 사용');
  lines.push(' */');
  lines.push('export const ALL_MODULES = [');

  allModules.forEach((module, index) => {
    const comma = index === allModules.length - 1 ? '' : ',';
    const comment = index === 0 && coreModules.length > 0 ? '  // Core' : index === coreModules.length && featureModules.length > 0 ? '  // Feature' : '';
    if (comment && index > 0) lines.push('');
    if (comment) lines.push(comment);
    lines.push(`  ${module.name}${comma}`);
  });

  lines.push('];');
  lines.push('');

  return lines.join('\n');
}

/**
 * 메인 함수
 */
function main() {
  console.log('🔍 모듈 탐색 중...');

  // 모듈 파일 찾기
  const modules = findModuleFiles(MODULES_DIR);

  if (modules.length === 0) {
    console.warn('⚠️  모듈을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ ${modules.length}개의 모듈을 발견했습니다:`);
  modules.forEach((module) => {
    console.log(`   - ${module.name} (${module.path})`);
  });

  // index.ts 생성
  const content = generateIndexContent(modules);
  fs.writeFileSync(INDEX_FILE, content, 'utf8');

  console.log(`\n✨ ${INDEX_FILE} 파일이 생성되었습니다.`);
}

// 실행
main();
