import { BaseSerializer } from '../../common/crud/serializers/base.serializer';
import { Product } from './product.entity';

/**
 * ProductSerializer
 *
 * @description
 * Product 엔티티의 직렬화 규칙을 정의합니다.
 * BaseSerializer를 상속받아 표준화된 직렬화를 구현합니다.
 *
 * 주요 기능:
 * 1. 민감 정보 자동 제외 (excludeFields)
 * 2. 관계 데이터 재귀적 직렬화 (relations)
 * 3. 커스텀 변환 로직 (transform)
 *
 * @example
 * ```typescript
 * // 사용 방법
 * const productSerializer = new ProductSerializer();
 * const serialized = productSerializer.serialize(product);
 *
 * // 결과
 * {
 *   "id": "123",
 *   "name": "노트북",
 *   "slug": "laptop-2024",
 *   "price": 1500000,
 *   // "deletedAt" ❌ 자동 제외됨
 * }
 * ```
 *
 * @see BaseSerializer - 기본 직렬화 클래스
 * @see SerializerRegistry - 전역 Serializer 레지스트리
 */
export class ProductSerializer extends BaseSerializer<Product> {
  /**
   * 응답에서 제외할 필드
   *
   * @description
   * 클라이언트에게 노출하지 않을 필드 목록입니다.
   * 보안상 민감하거나 내부 관리용 필드를 제외합니다.
   *
   * @example
   * ```typescript
   * // excludeFields에 정의된 필드는 응답에서 자동 제외됨
   * protected excludeFields = ['deletedAt', 'internalNote'];
   * ```
   *
   * @remarks
   * - deletedAt: Soft delete 관리 필드 (클라이언트에게 노출 불필요)
   * - 필요시 추가 필드 제외 가능 (예: internalNote, costPrice 등)
   */
  protected excludeFields = ['deletedAt'];

  /**
   * 관계 직렬화 매핑
   *
   * @description
   * 관계 필드에 적용할 Serializer를 매핑합니다.
   * SerializerRegistry에 등록된 Serializer가 자동 적용됩니다.
   *
   * @example
   * ```typescript
   * // Product에 category 관계가 있다면
   * protected relations = {
   *   category: 'category',  // Product.category → CategorySerializer 사용
   *   reviews: 'review',     // Product.reviews → ReviewSerializer 사용
   * };
   *
   * // API 응답
   * {
   *   "id": "123",
   *   "name": "노트북",
   *   "category": {
   *     "id": "456",
   *     "name": "전자제품"
   *     // CategorySerializer의 excludeFields 적용
   *   }
   * }
   * ```
   *
   * @remarks
   * - 현재 Product 모델에는 관계가 없으므로 빈 객체
   * - 향후 Category, Review 등 관계 추가 시 매핑 설정
   */
  protected relations = {
    // 예시: category 관계 추가 시
    // category: 'category',  // Product.category → CategorySerializer 사용
  };

  /**
   * 커스텀 변환 함수
   *
   * @description
   * 직렬화 과정에서 추가 변환이 필요한 경우 이 메서드를 구현합니다.
   * excludeFields 적용 후 호출되며, 계산 필드 추가나 형식 변환에 사용됩니다.
   *
   * @param data 직렬화 중인 데이터 (excludeFields 이미 적용됨)
   * @returns 변환된 데이터
   *
   * @example
   * ```typescript
   * // 할인가 계산 예시
   * protected transform(data: Partial<Product>): Partial<Product> {
   *   return {
   *     ...data,
   *     discountPrice: this.calculateDiscount(data.price, 0.1),
   *     formattedPrice: this.formatCurrency(data.price),
   *   };
   * }
   *
   * // API 응답
   * {
   *   "id": "123",
   *   "price": 1500000,
   *   "discountPrice": 1350000,     // ✅ 추가된 계산 필드
   *   "formattedPrice": "₩1,500,000" // ✅ 추가된 계산 필드
   * }
   * ```
   *
   * @remarks
   * - 현재는 기본 변환만 수행 (추가 변환 없음)
   * - 필요 시 아래 주석 해제하여 커스텀 변환 구현
   */
  protected transform(data: Partial<Product>): Partial<Product> {
    // 기본 변환만 수행 (추가 변환 없음)
    return data;

    // 예시: 커스텀 변환이 필요한 경우
    // return {
    //   ...data,
    //   // 가격을 천 단위 구분 문자로 포맷팅
    //   formattedPrice: this.formatCurrency(data.price),
    //   // 재고 상태 계산
    //   stockStatus: this.getStockStatus(data.stock),
    // };
  }

  /**
   * 예시: 통화 포맷팅 헬퍼 메서드
   *
   * @description
   * 숫자를 통화 형식으로 변환합니다.
   *
   * @param price 가격
   * @returns 포맷팅된 가격 문자열
   *
   * @example
   * ```typescript
   * this.formatCurrency(1500000) // "₩1,500,000"
   * ```
   */
  // private formatCurrency(price?: number): string | undefined {
  //   if (price === undefined || price === null) return undefined;
  //   return new Intl.NumberFormat('ko-KR', {
  //     style: 'currency',
  //     currency: 'KRW',
  //   }).format(price);
  // }

  /**
   * 예시: 재고 상태 계산 헬퍼 메서드
   *
   * @description
   * 재고 수량에 따라 상태를 반환합니다.
   *
   * @param stock 재고 수량
   * @returns 재고 상태 ('out_of_stock' | 'low_stock' | 'in_stock')
   *
   * @example
   * ```typescript
   * this.getStockStatus(0)  // "out_of_stock"
   * this.getStockStatus(3)  // "low_stock"
   * this.getStockStatus(50) // "in_stock"
   * ```
   */
  // private getStockStatus(stock?: number): string | undefined {
  //   if (stock === undefined || stock === null) return undefined;
  //   if (stock === 0) return 'out_of_stock';
  //   if (stock < 5) return 'low_stock';
  //   return 'in_stock';
  // }
}
