import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/product/product.repository';
import { ProductResult, toProductResult } from '../dto/product-result';
import { ProductNotFoundError } from '../errors/product.errors';

@Injectable()
export class GetProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(pid: number): Promise<ProductResult> {
    const product = await this.products.findByPid(pid);

    if (!product) {
      throw new ProductNotFoundError(pid);
    }

    return toProductResult(product);
  }
}
