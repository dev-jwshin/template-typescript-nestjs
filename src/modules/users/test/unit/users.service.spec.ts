import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../users.service';
import { PrismaService } from '../../../../database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
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
   *   it('user을 생성해야 함', async () => {
   *     const createDto = { name: 'Test' };
   *     const expected = { id: '1', ...createDto };
   *     mockPrisma.user.create.mockResolvedValue(expected);
   *
   *     const result = await service.create(createDto);
   *
   *     expect(result).toEqual(expected);
   *   });
   * });
   */
});
