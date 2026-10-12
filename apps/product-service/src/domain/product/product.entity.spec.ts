import { ProductEntity } from './product.entity';

describe('ProductEntity', () => {
  it('creates and normalizes a product', () => {
    const product = ProductEntity.createNew(
      '  Mechanical   Keyboard  ',
      '125.5',
      10,
    );

    expect(product.pid).toBeUndefined();
    expect(product.pname).toBe('Mechanical Keyboard');
    expect(product.price).toBe('125.50');
    expect(product.quantity).toBe(10);
    expect(product.isActive).toBe(true);
  });

  it('updates only provided fields', () => {
    const product = ProductEntity.createNew('Keyboard', '100.00', 10);

    product.update({
      price: '120',
      quantity: 8,
    });

    expect(product.pname).toBe('Keyboard');
    expect(product.price).toBe('120.00');
    expect(product.quantity).toBe(8);
  });

  it('soft-deletes a product', () => {
    const product = ProductEntity.createNew('Keyboard', '100.00', 10);

    product.deactivate();

    expect(product.isActive).toBe(false);
  });

  it.each([-1, 1.5, Number.NaN])('rejects invalid quantity %p', (quantity) => {
    expect(() =>
      ProductEntity.createNew('Keyboard', '100.00', quantity),
    ).toThrow('Product quantity must be a non-negative integer');
  });
});
