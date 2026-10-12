import { ProductEntity } from '../../../domain/product/product.entity';

export interface ProductResult {
  pid: number;
  pname: string;
  price: string;
  quantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResult {
  products: ProductResult[];
  total: number;
  page: number;
  pageSize: number;
}

export function toProductResult(product: ProductEntity): ProductResult {
  if (product.pid === undefined) {
    throw new Error('Product has not been persisted');
  }

  return {
    pid: product.pid,
    pname: product.pname,
    price: product.price,
    quantity: product.quantity,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
