import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { PaginatedResponse } from '../../common/dto/jsonapi-query.dto';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * JSON:API 쿼리 옵션
 */
interface FindAllOptions {
  fields?: string[];
  filter?: Record<string, any>;
  sort?: Array<{ field: string; order: 'ASC' | 'DESC' }>;
  page?: { number: number; size: number };
}

/**
 * 사용자 서비스 (JSON:API 지원, Prisma ORM)
 * - 사용자 관련 비즈니스 로직 처리
 * - CRUD 작업 구현
 * - Filtering, Sorting, Pagination 지원
 * - PostgreSQL 데이터베이스 연동
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * 새 사용자 생성
   * @param createUserDto 사용자 생성 데이터
   * @returns 생성된 사용자 정보
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
      },
    });

    // 비밀번호는 응답에서 제외
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 모든 사용자 조회 (JSON:API - Filtering, Sorting, Pagination 지원)
   * @param options 쿼리 옵션
   * @returns 사용자 목록 또는 페이지네이션된 응답
   */
  async findAll(
    options?: FindAllOptions,
  ): Promise<Omit<User, 'password'>[] | PaginatedResponse<Omit<User, 'password'>>> {
    // Prisma 쿼리 옵션 구성
    const where = this.buildWhereClause(options?.filter);
    const orderBy = this.buildOrderByClause(options?.sort);

    // Pagination이 있는 경우
    if (options?.page) {
      const { number, size } = options.page;
      const skip = (number - 1) * size;
      const take = size;

      const [users, totalItems] = await Promise.all([
        this.prisma.user.findMany({
          where,
          orderBy,
          skip,
          take,
        }),
        this.prisma.user.count({ where }),
      ]);

      const items = users.map(({ password, ...user }) => user);
      const totalPages = Math.ceil(totalItems / size);

      return {
        items,
        meta: {
          currentPage: number,
          pageSize: size,
          totalItems,
          totalPages,
        },
      };
    }

    // Pagination이 없는 경우
    const users = await this.prisma.user.findMany({
      where,
      orderBy,
    });

    return users.map(({ password, ...user }) => user);
  }

  /**
   * Prisma where 절 구성 (Filtering)
   */
  private buildWhereClause(filter?: Record<string, any>) {
    if (!filter) return {};

    const where: any = {};

    Object.keys(filter).forEach((key) => {
      const value = filter[key];

      // 문자열 필터링 (대소문자 무시, 부분 일치)
      if (typeof value === 'string') {
        where[key] = {
          contains: value,
          mode: 'insensitive',
        };
      }
      // Boolean 필터링
      else if (typeof value === 'boolean' || value === 'true' || value === 'false') {
        where[key] = value === 'true' || value === true;
      }
      // 기타 (정확한 일치)
      else {
        where[key] = value;
      }
    });

    return where;
  }

  /**
   * Prisma orderBy 절 구성 (Sorting)
   */
  private buildOrderByClause(sort?: Array<{ field: string; order: 'ASC' | 'DESC' }>) {
    if (!sort || sort.length === 0) return undefined;

    return sort.map(({ field, order }) => ({
      [field]: order.toLowerCase(),
    }));
  }

  /**
   * ID로 사용자 조회 (JSON:API - Sparse Fieldsets 지원)
   * @param id 사용자 ID
   * @param fields 반환할 필드 목록 (선택)
   * @returns 사용자 정보
   * @throws NotFoundException 사용자를 찾을 수 없는 경우
   */
  async findOne(id: string, fields?: string[]): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`사용자 ID ${id}를 찾을 수 없습니다.`);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 사용자 정보 수정
   * @param id 사용자 ID
   * @param updateUserDto 수정할 데이터
   * @returns 수정된 사용자 정보
   * @throws NotFoundException 사용자를 찾을 수 없는 경우
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    // 사용자 존재 여부 확인
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException(`사용자 ID ${id}를 찾을 수 없습니다.`);
    }

    // 비밀번호가 포함된 경우 해싱
    const updateData: any = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 사용자 삭제
   * @param id 사용자 ID
   * @returns 삭제 성공 메시지
   * @throws NotFoundException 사용자를 찾을 수 없는 경우
   */
  async remove(id: string): Promise<{ message: string }> {
    // 사용자 존재 여부 확인
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException(`사용자 ID ${id}를 찾을 수 없습니다.`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: `사용자 ID ${id}가 삭제되었습니다.` };
  }
}
