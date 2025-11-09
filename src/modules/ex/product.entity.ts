import { Product as PrismaProduct } from '@prisma/client';

/**
 * Product 엔티티 타입
 *
 * @description
 * Prisma 스키마에서 자동 생성된 타입을 재사용합니다.
 *
 * 특징:
 * - Prisma Client가 schema.prisma를 기반으로 생성한 타입
 * - 모든 필드는 데이터베이스 스키마와 1:1 매칭됨
 * - 타입 안정성을 보장하여 컴파일 타임에 오류 감지
 * - 응답 직렬화는 ProductSerializer에서 처리 (deletedAt 자동 제외)
 *
 * @example
 * ```typescript
 * // 서비스에서 사용
 * async findOne(id: string): Promise<Product> {
 *   const product = await this.prisma.product.findUnique({ where: { id } });
 *   return this.serialize(product);  // deletedAt 자동 제외
 * }
 * ```
 *
 * @remarks
 * - 직렬화 로직은 ProductSerializer에서 중앙 관리
 * - Omit<Product, 'deletedAt'> 같은 타입을 별도로 정의할 필요 없음
 * - serialize() 메서드가 자동으로 민감 정보 제외
 *
 * @see ProductSerializer - 직렬화 규칙 정의 (excludeFields, relations, transform)
 */
export type Product = PrismaProduct;
