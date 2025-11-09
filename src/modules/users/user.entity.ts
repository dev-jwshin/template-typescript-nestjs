import { User as PrismaUser } from '@prisma/client';

/**
 * User 엔티티 타입
 *
 * Prisma 스키마에서 자동 생성된 타입을 재사용합니다.
 */
export type User = PrismaUser;

/**
 * TODO: 필요시 아래와 같이 추가 타입 정의
 *
 * @example
 * // 비밀번호를 제외한 타입
 * export type SafeUser = Omit<User, 'password'>;
 *
 * // 공개 프로필용 타입
 * export type PublicUser = Pick<User, 'id' | 'name' | 'createdAt'>;
 */
