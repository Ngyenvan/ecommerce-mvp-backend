import { Money } from './money.value-object';

export interface RestoreProductProps {
  pid: number;
  pname: string;
  price: string;
  quantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProductProps {
  pname?: string;
  price?: string;
  quantity?: number;
  isActive?: boolean;
}

export class ProductEntity {
  private constructor(
    private readonly productId: number | undefined,
    private productName: string,
    private productPrice: Money,
    private stockQuantity: number,
    private active: boolean,
    private readonly creationDate: Date,
    private modificationDate: Date,
  ) {}

  static createNew(
    pname: string,
    price: string,
    quantity: number,
  ): ProductEntity {
    const normalizedName = this.normalizeName(pname);

    this.validateName(normalizedName);
    this.validateQuantity(quantity);

    const now = new Date();

    return new ProductEntity(
      undefined,
      normalizedName,
      Money.from(price),
      quantity,
      true,
      now,
      now,
    );
  }

  static restore(props: RestoreProductProps): ProductEntity {
    if (!Number.isInteger(props.pid) || props.pid <= 0) {
      throw new Error('Product id must be a positive integer');
    }

    const normalizedName = this.normalizeName(props.pname);

    this.validateName(normalizedName);
    this.validateQuantity(props.quantity);

    if (
      !(props.createdAt instanceof Date) ||
      Number.isNaN(props.createdAt.getTime()) ||
      !(props.updatedAt instanceof Date) ||
      Number.isNaN(props.updatedAt.getTime())
    ) {
      throw new Error('Product dates are invalid');
    }

    return new ProductEntity(
      props.pid,
      normalizedName,
      Money.from(props.price),
      props.quantity,
      props.isActive,
      new Date(props.createdAt),
      new Date(props.updatedAt),
    );
  }

  update(props: UpdateProductProps): void {
    if (
      props.pname === undefined &&
      props.price === undefined &&
      props.quantity === undefined &&
      props.isActive === undefined
    ) {
      throw new Error('At least one product field must be provided');
    }

    if (props.pname !== undefined) {
      const normalizedName = ProductEntity.normalizeName(props.pname);

      ProductEntity.validateName(normalizedName);
      this.productName = normalizedName;
    }

    if (props.price !== undefined) {
      this.productPrice = Money.from(props.price);
    }

    if (props.quantity !== undefined) {
      ProductEntity.validateQuantity(props.quantity);
      this.stockQuantity = props.quantity;
    }

    if (props.isActive !== undefined) {
      this.active = props.isActive;
    }

    this.modificationDate = new Date();
  }

  deactivate(): void {
    this.active = false;
    this.modificationDate = new Date();
  }

  private static normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  private static validateName(name: string): void {
    if (name.length === 0 || name.length > 100) {
      throw new Error('Product name must contain between 1 and 100 characters');
    }
  }

  private static validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error('Product quantity must be a non-negative integer');
    }
  }

  get pid(): number | undefined {
    return this.productId;
  }

  get pname(): string {
    return this.productName;
  }

  get price(): string {
    return this.productPrice.toString();
  }

  get quantity(): number {
    return this.stockQuantity;
  }

  get isActive(): boolean {
    return this.active;
  }

  get createdAt(): Date {
    return new Date(this.creationDate);
  }

  get updatedAt(): Date {
    return new Date(this.modificationDate);
  }
}
