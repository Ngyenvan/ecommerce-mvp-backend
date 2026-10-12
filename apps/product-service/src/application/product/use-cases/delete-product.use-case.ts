import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/product/product.repository';
import { ProductNotFoundError } from '../errors/product.errors';

export interface DeleteProductResult {
  deleted: boolean;
}

@Injectable()
export class DeleteProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(pid: number): Promise<DeleteProductResult> {
    const product = await this.products.findByPid(pid);

    if (!product) {
      throw new ProductNotFoundError(pid);
    }

    if (!product.isActive) {
      return {
        deleted: false,
      };
    }

    product.deactivate();
    await this.products.update(product);

    return {
      deleted: true,
    };
  }
}
