import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './api/products.controller';
import { AdminProductsController } from './admin/products.controller';
import { createCrudConfigProvider } from '../../common/crud';

@Module({
  controllers: [ProductsController, AdminProductsController],
  providers: [
    ProductsService,
    createCrudConfigProvider(ProductsController),
    createCrudConfigProvider(AdminProductsController),
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
