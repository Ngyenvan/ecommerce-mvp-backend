import { ProductEntity } from '../../domain/product/product.entity';
import { ProductRepository } from '../../domain/product/product.repository';
import {
  InvalidProductListQueryError,
  InvalidProductUpdateError,
  ProductNotFoundError,
} from './errors/product.errors';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { DeleteProductUseCase } from './use-cases/delete-product.use-case';
import { GetProductUseCase } from './use-cases/get-product.use-case';
import { ListProductsUseCase } from './use-cases/list-products.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';

describe('Product CRUD use cases', () => {
  const products = {
    findByPid: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const now = new Date('2026-10-12T10:00:00.000Z');

  const persistedProduct = (isActive = true): ProductEntity =>
    ProductEntity.restore({
      pid: 1,
      pname: 'Keyboard',
      price: '99.90',
      quantity: 10,
      isActive,
      createdAt: now,
      updatedAt: now,
    });

  let createProduct: CreateProductUseCase;
  let getProduct: GetProductUseCase;
  let listProducts: ListProductsUseCase;
  let updateProduct: UpdateProductUseCase;
  let deleteProduct: DeleteProductUseCase;

  beforeEach(() => {
    jest.resetAllMocks();

    products.create.mockResolvedValue(persistedProduct());
    products.update.mockImplementation(
      async (product: ProductEntity) => product,
    );

    createProduct = new CreateProductUseCase(
      products as unknown as ProductRepository,
    );
    getProduct = new GetProductUseCase(
      products as unknown as ProductRepository,
    );
    listProducts = new ListProductsUseCase(
      products as unknown as ProductRepository,
    );
    updateProduct = new UpdateProductUseCase(
      products as unknown as ProductRepository,
    );
    deleteProduct = new DeleteProductUseCase(
      products as unknown as ProductRepository,
    );
  });

  it('creates and maps a product', async () => {
    const result = await createProduct.execute({
      pname: ' Keyboard ',
      price: '99.9',
      quantity: 10,
    });

    expect(result).toMatchObject({
      pid: 1,
      pname: 'Keyboard',
      price: '99.90',
      quantity: 10,
      isActive: true,
    });
  });

  it('throws when a product does not exist', async () => {
    products.findByPid.mockResolvedValue(null);

    await expect(getProduct.execute(999)).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });

  it('applies default list pagination', async () => {
    products.list.mockResolvedValue({
      products: [persistedProduct()],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const result = await listProducts.execute({
      page: 0,
      pageSize: 0,
      search: ' keyboard ',
    });

    expect(products.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: 'keyboard',
    });
    expect(result.total).toBe(1);
  });

  it('rejects an invalid page size', async () => {
    await expect(
      listProducts.execute({
        page: 1,
        pageSize: 101,
      }),
    ).rejects.toBeInstanceOf(InvalidProductListQueryError);
  });

  it('updates only provided fields', async () => {
    products.findByPid.mockResolvedValue(persistedProduct());

    const result = await updateProduct.execute({
      pid: 1,
      quantity: 20,
    });

    expect(result.quantity).toBe(20);
    expect(result.pname).toBe('Keyboard');
    expect(products.update).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty product update', async () => {
    await expect(
      updateProduct.execute({
        pid: 1,
      }),
    ).rejects.toBeInstanceOf(InvalidProductUpdateError);

    expect(products.findByPid).not.toHaveBeenCalled();
  });

  it('soft-deletes an active product', async () => {
    products.findByPid.mockResolvedValue(persistedProduct());

    await expect(deleteProduct.execute(1)).resolves.toEqual({
      deleted: true,
    });

    expect(products.update).toHaveBeenCalledTimes(1);
  });

  it('returns false when product is already inactive', async () => {
    products.findByPid.mockResolvedValue(persistedProduct(false));

    await expect(deleteProduct.execute(1)).resolves.toEqual({
      deleted: false,
    });

    expect(products.update).not.toHaveBeenCalled();
  });
});
