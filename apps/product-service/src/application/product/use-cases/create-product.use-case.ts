import { Injectable } from '@nestjs/common';
import { ProductEntity } from '../../../domain/product/product.entity';
import { ProductRepository } from '../../../domain/product/product.repository';
import { ProductResult, toProductResult } from '../dto/product-result';

export interface CreateProductCommand {
  pname: string;
  price: string;
  quantity: number;
}

@Injectable()
export class CreateProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(command: CreateProductCommand): Promise<ProductResult> {
    const product = ProductEntity.createNew(
      command.pname,
      command.price,
      command.quantity,
    );

    const savedProduct = await this.products.create(product);

    return toProductResult(savedProduct);
  }
}
