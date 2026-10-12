import { ProductEntity } from './product.entity';

export interface ListProductsQuery {
  page: number;
  pageSize: number;
  search: string;
}

export interface ProductPage {
  products: ProductEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export abstract class ProductRepository {
  abstract findByPid(pid: number): Promise<ProductEntity | null>;

  abstract list(query: ListProductsQuery): Promise<ProductPage>;

  abstract create(product: ProductEntity): Promise<ProductEntity>;

  abstract update(product: ProductEntity): Promise<ProductEntity>;
}
