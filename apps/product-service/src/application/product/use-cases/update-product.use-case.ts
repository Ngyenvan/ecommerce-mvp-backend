import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/product/product.repository';
import { ProductResult, toProductResult } from '../dto/product-result';
import {
  InvalidProductUpdateError,
  ProductNotFoundError,
} from '../errors/product.errors';

export interface UpdateProductCommand {
  pid: number;
  pname?: string;
  price?: string;
  quantity?: number;
  isActive?: boolean;
}

@Injectable()
export class UpdateProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(command: UpdateProductCommand): Promise<ProductResult> {
    if (
      command.pname === undefined &&
      command.price === undefined &&
      command.quantity === undefined &&
      command.isActive === undefined
    ) {
      throw new InvalidProductUpdateError();
    }

    const product = await this.products.findByPid(command.pid);

    if (!product) {
      throw new ProductNotFoundError(command.pid);
    }

    product.update({
      pname: command.pname,
      price: command.price,
      quantity: command.quantity,
      isActive: command.isActive,
    });

    const savedProduct = await this.products.update(product);

    return toProductResult(savedProduct);
  }
}
