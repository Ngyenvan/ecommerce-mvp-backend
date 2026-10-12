import { Module } from '@nestjs/common';
import { ProductPersistenceModule } from '../../infrastructure/database/product-persistence.module';
import { ConfirmInventoryReservationUseCase } from '../inventory/use-cases/confirm-inventory-reservation.use-case';
import { ReleaseInventoryReservationUseCase } from '../inventory/use-cases/release-inventory-reservation.use-case';
import { ReserveInventoryUseCase } from '../inventory/use-cases/reserve-inventory.use-case';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { DeleteProductUseCase } from './use-cases/delete-product.use-case';
import { GetProductUseCase } from './use-cases/get-product.use-case';
import { ListProductsUseCase } from './use-cases/list-products.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';

const productUseCases = [
  CreateProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
  UpdateProductUseCase,
  DeleteProductUseCase,
];

const inventoryUseCases = [
  ReserveInventoryUseCase,
  ConfirmInventoryReservationUseCase,
  ReleaseInventoryReservationUseCase,
];

@Module({
  imports: [ProductPersistenceModule],
  providers: [...productUseCases, ...inventoryUseCases],
  exports: [...productUseCases, ...inventoryUseCases],
})
export class ProductApplicationModule {}
