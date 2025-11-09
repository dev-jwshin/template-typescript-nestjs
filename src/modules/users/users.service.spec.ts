import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

// bcrypt 모킹
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    // 모든 모킹 초기화
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('비밀번호를 해싱하여 사용자를 생성해야 함', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'plainPassword',
      };

      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
        },
      });
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('update', () => {
    it('비밀번호를 해싱하여 사용자를 업데이트해야 함', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated User',
        password: 'newPassword',
      };

      const hashedPassword = 'newHashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated User',
        password: hashedPassword,
      });

      const result = await service.update(mockUser.id, updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          name: 'Updated User',
          password: hashedPassword,
        },
      });
      expect(result).not.toHaveProperty('password');
    });

    it('비밀번호 없이 사용자를 업데이트해야 함', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated User',
      });

      await service.update(mockUser.id, updateUserDto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          name: 'Updated User',
        },
      });
    });
  });

  describe('findByEmail', () => {
    it('이메일로 사용자를 찾아야 함', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('사용자가 없으면 null을 반환해야 함', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findActiveUsers', () => {
    it('활성 사용자만 조회해야 함', async () => {
      const activeUsers = [
        { ...mockUser, id: '1' },
        { ...mockUser, id: '2' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(activeUsers);

      const result = await service.findActiveUsers();

      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('findAll', () => {
    it('모든 사용자를 조회해야 함', async () => {
      const users = [mockUser];
      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.findAll({});

      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('페이지네이션과 함께 사용자를 조회해야 함', async () => {
      const users = [mockUser];
      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: { number: 1, size: 10 },
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(mockPrismaService.user.count).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('ID로 사용자를 찾아야 함', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).not.toHaveProperty('password');
    });

    it('사용자를 찾을 수 없으면 NotFoundException을 던져야 함', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('사용자를 삭제해야 함', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove(mockUser.id);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toHaveProperty('message');
    });

    it('사용자를 찾을 수 없으면 NotFoundException을 던져야 함', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow();
    });
  });
});
