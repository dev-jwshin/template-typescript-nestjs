import { BaseSerializer } from '../../common/crud/serializers/base.serializer';
import { Product } from './product.entity';

export class ProductSerializer extends BaseSerializer<Product> {
  protected excludeFields = ['deletedAt'];

  protected relations = {
    // 예시: category 관계 추가 시
    // category: 'category',  // Product.category → CategorySerializer 사용
  };

  protected transform(data: Partial<Product>): Partial<Product> {
    return data;
  }
}
