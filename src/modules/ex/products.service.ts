import { Injectable, Inject } from '@nestjs/common';
import { CrudBaseService, CrudConfig, CRUD_CONFIG } from '../../common/crud';
import { PrismaService } from '../../database/prisma.service';
import { Product } from './product.entity';

@Injectable()
export class ProductsService extends CrudBaseService<Product> {
  constructor(prisma: PrismaService, @Inject(CRUD_CONFIG) config: CrudConfig) {
    super(prisma, 'product', config);
  }
}
