import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/product/product.repository';
import { ProductListResult, toProductResult } from '../dto/product-result';
import { InvalidProductListQueryError } from '../errors/product.errors';

export interface ListProductsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

@Injectable()
export class ListProductsUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(query: ListProductsQuery): Promise<ProductListResult> {
    const requestedPage = query.page ?? 0;
    const requestedPageSize = query.pageSize ?? 0;
    const search = (query.search ?? '').trim();

    if (!Number.isInteger(requestedPage) || requestedPage < 0) {
      throw new InvalidProductListQueryError(
        'Page must be a non-negative integer',
      );
    }

    if (
      !Number.isInteger(requestedPageSize) ||
      requestedPageSize < 0 ||
      requestedPageSize > 100
    ) {
      throw new InvalidProductListQueryError(
        'Page size must be between 0 and 100',
      );
    }

    if (search.length > 100) {
      throw new InvalidProductListQueryError(
        'Search must not exceed 100 characters',
      );
    }

    const page = requestedPage === 0 ? 1 : requestedPage;

    const pageSize = requestedPageSize === 0 ? 20 : requestedPageSize;

    const result = await this.products.list({
      page,
      pageSize,
      search,
    });

    return {
      products: result.products.map(toProductResult),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
