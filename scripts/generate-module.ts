#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

/**
 * 모듈 생성 스크립트
 *
 * CLAUDE.md의 표준 모듈 구조를 기반으로 NestJS 모듈을 자동 생성합니다.
 */

// readline 인터페이스 생성
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * 사용자 입력 받기 (Promise 기반)
 */
function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * 첫 글자를 대문자로 변환
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * PascalCase로 변환 (user-profile → UserProfile)
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((part) => capitalize(part))
    .join('');
}

/**
 * camelCase로 변환 (user-profile → userProfile)
 */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * 디렉토리 생성 (재귀적)
 */
function createDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 디렉토리 생성: ${dirPath}`);
  }
}

/**
 * 파일 생성
 */
function createFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ 파일 생성: ${filePath}`);
}

/**
 * Entity 파일 템플릿
 */
function getEntityTemplate(modelName: string, pascalName: string): string {
  return `import { ${pascalName} as Prisma${pascalName} } from '@prisma/client';

/**
 * ${pascalName} 엔티티 타입
 *
 * Prisma 스키마에서 자동 생성된 타입을 재사용합니다.
 */
export type ${pascalName} = Prisma${pascalName};

/**
 * TODO: 필요시 아래와 같이 추가 타입 정의
 *
 * @example
 * // 비밀번호를 제외한 타입
 * export type Safe${pascalName} = Omit<${pascalName}, 'password'>;
 *
 * // 공개 프로필용 타입
 * export type Public${pascalName} = Pick<${pascalName}, 'id' | 'name' | 'createdAt'>;
 */
`;
}

/**
 * Service 파일 템플릿
 */
function getServiceTemplate(modelName: string, pascalName: string, camelName: string): string {
  return `import { Injectable } from '@nestjs/common';
import { CrudBaseService } from '../../common/crud/services/crud-base.service';
import { PrismaService } from '../../database/prisma.service';
import { ${pascalName} } from './${modelName}.entity';

/**
 * ${pascalName} 서비스
 *
 * CrudBaseService를 상속하여 기본 CRUD 작업을 자동으로 구현합니다.
 */
@Injectable()
export class ${pascalName}sService extends CrudBaseService<${pascalName}> {
  constructor(prisma: PrismaService) {
    super(prisma, '${camelName}', {
      allowedIncludes: [], // TODO: 허용할 관계 설정 (예: ['profile', 'posts'])
      allowedFilters: {
        // TODO: 허용할 필터 설정
        // name: ['eq', 'like', 'ilike'],
        // email: ['eq'],
        // isActive: ['eq'],
      },
      allowedSorts: ['createdAt', 'updatedAt'], // TODO: 허용할 정렬 필드 설정
      performance: {
        query: { eagerLoad: true }, // N+1 쿼리 자동 최적화
      },
      serialize: {
        exclude: [], // TODO: 응답에서 제외할 필드 설정 (예: ['password'])
      },
    });
  }

  /**
   * TODO: 커스텀 메서드 추가
   *
   * @example
   * async findByEmail(email: string): Promise<${pascalName} | null> {
   *   const ${camelName} = await this.model.findUnique({
   *     where: { email },
   *   });
   *   return ${camelName} ? this.serialize(${camelName}) : null;
   * }
   */
}
`;
}

/**
 * Module 파일 템플릿
 */
function getModuleTemplate(modelName: string, pascalName: string): string {
  return `import { Module } from '@nestjs/common';
import { ${pascalName}sService } from './${modelName}s.service';
import { ${pascalName}sController } from './api/${modelName}s.controller';
// import { Admin${pascalName}sController } from './admin/${modelName}s.controller'; // 관리자 컨트롤러 필요시 활성화

/**
 * ${pascalName}s 모듈
 *
 * ${pascalName} 관련 컨트롤러와 서비스를 등록합니다.
 */
@Module({
  controllers: [
    ${pascalName}sController, // 일반 사용자 API
    // Admin${pascalName}sController, // 관리자 API (필요시 활성화)
  ],
  providers: [${pascalName}sService],
  exports: [${pascalName}sService], // 다른 모듈에서 사용 가능
})
export class ${pascalName}sModule {}
`;
}

/**
 * API Controller 파일 템플릿
 */
function getApiControllerTemplate(modelName: string, pascalName: string): string {
  return `import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../../common/crud';
import { ${pascalName}sService } from '../${modelName}s.service';

/**
 * ${pascalName}s API 컨트롤러
 *
 * 일반 사용자용 API 엔드포인트를 제공합니다.
 */
@Crud({
  only: [
    CrudOperation.Index, // GET /api/${modelName}s
    CrudOperation.Show, // GET /api/${modelName}s/:id
    // TODO: 필요한 작업만 활성화
    // CrudOperation.Create,  // POST /api/${modelName}s
    // CrudOperation.Update,  // PATCH /api/${modelName}s/:id
    // CrudOperation.Delete,  // DELETE /api/${modelName}s/:id
  ],
  resourceType: '${modelName}s',
  allowedFilters: {
    // TODO: 허용할 필터 설정
    // name: ['eq', 'like'],
    // isActive: ['eq'],
  },
  allowedSorts: ['createdAt', 'updatedAt'],
  allowedIncludes: [], // TODO: 허용할 관계 설정
  pagination: {
    defaultLimit: 20,
    limit: 100,
  },
})
@Controller('${modelName}s')
export class ${pascalName}sController {
  constructor(private readonly ${modelName}sService: ${pascalName}sService) {}

  /**
   * TODO: 커스텀 엔드포인트 추가
   *
   * @example
   * @Get('search')
   * async search(@Query('q') query: string) {
   *   return this.${modelName}sService.search(query);
   * }
   */
}
`;
}

/**
 * Admin Controller 파일 템플릿
 */
function getAdminControllerTemplate(modelName: string, pascalName: string): string {
  return `import { Controller } from '@nestjs/common';
import { Crud, CrudOperation } from '../../../common/crud';
import { ${pascalName}sService } from '../${modelName}s.service';

/**
 * ${pascalName}s 관리자 컨트롤러
 *
 * 관리자 전용 API 엔드포인트를 제공합니다.
 */
@Crud({
  only: [
    CrudOperation.Index, // GET /admin/${modelName}s
    CrudOperation.Show, // GET /admin/${modelName}s/:id
    CrudOperation.Create, // POST /admin/${modelName}s
    CrudOperation.Update, // PATCH /admin/${modelName}s/:id
    CrudOperation.Delete, // DELETE /admin/${modelName}s/:id
  ],
  resourceType: '${modelName}s',
  allowedFilters: {
    // TODO: 허용할 필터 설정
  },
  allowedSorts: ['createdAt', 'updatedAt'],
  allowedIncludes: [],
  allowedParams: {
    // TODO: 필수/선택 파라미터 설정
  },
})
// @UseGuards(AdminGuard) // TODO: 관리자 가드 추가
@Controller('admin/${modelName}s')
export class Admin${pascalName}sController {
  constructor(private readonly ${modelName}sService: ${pascalName}sService) {}
}
`;
}

/**
 * Create DTO 파일 템플릿
 */
function getCreateDtoTemplate(pascalName: string): string {
  return `import { IsString, IsOptional, IsBoolean, IsInt, IsEmail, IsUUID } from 'class-validator';

/**
 * ${pascalName} 생성 DTO
 *
 * class-validator 데코레이터를 사용하여 입력 값을 검증합니다.
 */
export class Create${pascalName}Dto {
  /**
   * TODO: 필요한 필드 정의
   *
   * @example
   * @IsString()
   * name: string;
   *
   * @IsEmail()
   * email: string;
   *
   * @IsOptional()
   * @IsBoolean()
   * isActive?: boolean;
   */
}
`;
}

/**
 * Update DTO 파일 템플릿
 */
function getUpdateDtoTemplate(pascalName: string): string {
  return `import { PartialType } from '@nestjs/mapped-types';
import { Create${pascalName}Dto } from './create-${pascalName.toLowerCase()}.dto';

/**
 * ${pascalName} 수정 DTO
 *
 * Create${pascalName}Dto의 모든 필드를 선택적으로 만듭니다.
 */
export class Update${pascalName}Dto extends PartialType(Create${pascalName}Dto) {}
`;
}

/**
 * Service Unit 테스트 템플릿
 */
function getServiceTestTemplate(modelName: string, pascalName: string, camelName: string): string {
  return `import { Test, TestingModule } from '@nestjs/testing';
import { ${pascalName}sService } from '../../${modelName}s.service';
import { PrismaService } from '../../../../database/prisma.service';

describe('${pascalName}sService', () => {
  let service: ${pascalName}sService;
  let prisma: PrismaService;

  const mockPrisma = {
    ${camelName}: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [${pascalName}sService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<${pascalName}sService>(${pascalName}sService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * TODO: 테스트 케이스 추가
   *
   * @example
   * describe('create', () => {
   *   it('${camelName}을 생성해야 함', async () => {
   *     const createDto = { name: 'Test' };
   *     const expected = { id: '1', ...createDto };
   *     mockPrisma.${camelName}.create.mockResolvedValue(expected);
   *
   *     const result = await service.create(createDto);
   *
   *     expect(result).toEqual(expected);
   *   });
   * });
   */
});
`;
}

/**
 * E2E 테스트 템플릿
 */
function getE2eTestTemplate(modelName: string, pascalName: string): string {
  return `import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ${pascalName}sModule } from '../../${modelName}s.module';
import { PrismaService } from '../../../../database/prisma.service';

describe('${pascalName}sController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [${pascalName}sModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * TODO: E2E 테스트 케이스 추가
   *
   * @example
   * describe('GET /${modelName}s', () => {
   *   it('${modelName} 목록을 반환해야 함', () => {
   *     return request(app.getHttpServer())
   *       .get('/${modelName}s')
   *       .expect(200)
   *       .expect((res) => {
   *         expect(res.body.data).toBeInstanceOf(Array);
   *       });
   *   });
   * });
   */
});
`;
}

/**
 * 모듈 생성 메인 함수
 */
async function generateModule(): Promise<void> {
  console.log('🚀 NestJS 모듈 생성기\n');
  console.log('CLAUDE.md의 표준 모듈 구조를 기반으로 모듈을 생성합니다.\n');

  // 모듈명 입력 받기
  const modelNameInput = await question('생성할 모듈명을 입력하세요 (예: user, post, comment): ');
  const modelName = modelNameInput.trim().toLowerCase();

  if (!modelName) {
    console.error('❌ 모듈명을 입력해주세요.');
    rl.close();
    return;
  }

  // 이름 변환
  const pascalName = toPascalCase(modelName);
  const camelName = toCamelCase(modelName);

  console.log(`\n📦 모듈 정보:`);
  console.log(`   - 모듈명 (kebab-case): ${modelName}`);
  console.log(`   - 클래스명 (PascalCase): ${pascalName}`);
  console.log(`   - 변수명 (camelCase): ${camelName}\n`);

  // 확인
  const confirm = await question('위 정보로 모듈을 생성하시겠습니까? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ 모듈 생성이 취소되었습니다.');
    rl.close();
    return;
  }

  console.log('\n📂 모듈 생성 중...\n');

  // 기본 경로
  const basePath = path.join(__dirname, '..', 'src', 'modules', `${modelName}s`);

  // 디렉토리 생성
  createDirectory(basePath);
  createDirectory(path.join(basePath, 'admin'));
  createDirectory(path.join(basePath, 'api'));
  createDirectory(path.join(basePath, 'dto'));
  createDirectory(path.join(basePath, 'interfaces'));
  createDirectory(path.join(basePath, 'test', 'unit'));
  createDirectory(path.join(basePath, 'test', 'e2e'));

  // 파일 생성
  createFile(
    path.join(basePath, `${modelName}.entity.ts`),
    getEntityTemplate(modelName, pascalName)
  );

  createFile(
    path.join(basePath, `${modelName}s.service.ts`),
    getServiceTemplate(modelName, pascalName, camelName)
  );

  createFile(
    path.join(basePath, `${modelName}s.module.ts`),
    getModuleTemplate(modelName, pascalName)
  );

  createFile(
    path.join(basePath, 'api', `${modelName}s.controller.ts`),
    getApiControllerTemplate(modelName, pascalName)
  );

  createFile(
    path.join(basePath, 'admin', `${modelName}s.controller.ts`),
    getAdminControllerTemplate(modelName, pascalName)
  );

  createFile(
    path.join(basePath, 'dto', `create-${modelName}.dto.ts`),
    getCreateDtoTemplate(pascalName)
  );

  createFile(
    path.join(basePath, 'dto', `update-${modelName}.dto.ts`),
    getUpdateDtoTemplate(pascalName)
  );

  createFile(
    path.join(basePath, 'test', 'unit', `${modelName}s.service.spec.ts`),
    getServiceTestTemplate(modelName, pascalName, camelName)
  );

  createFile(
    path.join(basePath, 'test', 'e2e', `${modelName}s.e2e-spec.ts`),
    getE2eTestTemplate(modelName, pascalName)
  );

  console.log('\n✅ 모듈 생성 완료!\n');
  console.log('📝 다음 단계:');
  console.log(`   1. prisma/schema.prisma에 ${pascalName} 모델 추가`);
  console.log(`   2. pnpm prisma:migrate 실행`);
  console.log(`   3. src/app.module.ts에 ${pascalName}sModule import`);
  console.log(`   4. ${basePath}의 TODO 주석 참고하여 코드 수정`);
  console.log(`   5. 테스트 작성 및 실행\n`);

  console.log('📂 생성된 파일 목록:');
  console.log(`   ${basePath}/`);
  console.log(`   ├── admin/${modelName}s.controller.ts`);
  console.log(`   ├── api/${modelName}s.controller.ts`);
  console.log(`   ├── dto/create-${modelName}.dto.ts`);
  console.log(`   ├── dto/update-${modelName}.dto.ts`);
  console.log(`   ├── test/unit/${modelName}s.service.spec.ts`);
  console.log(`   ├── test/e2e/${modelName}s.e2e-spec.ts`);
  console.log(`   ├── ${modelName}.entity.ts`);
  console.log(`   ├── ${modelName}s.service.ts`);
  console.log(`   └── ${modelName}s.module.ts\n`);

  rl.close();
}

// 스크립트 실행
generateModule().catch((error) => {
  console.error('❌ 오류 발생:', error);
  rl.close();
  process.exit(1);
});
