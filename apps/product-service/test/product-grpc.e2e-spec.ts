import 'dotenv/config';
import { join } from 'node:path';
import { INestMicroservice } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ClientGrpc,
  ClientProxy,
  ClientProxyFactory,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { firstValueFrom, Observable } from 'rxjs';
import { AppModule } from '../src/app.module';

interface Product {
  pid: number;
  pname: string;
  price: string;
  quantity: number;
  isActive: boolean;
}

interface ProductResponse {
  product: Product;
}

interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}

interface ReservationResponse {
  reservationId: string;
  status: string;
}

interface ProductServiceClient {
  createProduct(request: {
    pname: string;
    price: string;
    quantity: number;
  }): Observable<ProductResponse>;
  getProduct(request: { pid: number }): Observable<ProductResponse>;
  updateProduct(request: {
    pid: number;
    pname?: string;
    price?: string;
    quantity?: number;
    isActive?: boolean;
  }): Observable<ProductResponse>;
  listProducts(request: {
    page: number;
    pageSize: number;
    search: string;
  }): Observable<ProductListResponse>;
  deleteProduct(request: { pid: number }): Observable<{ deleted: boolean }>;
  reserveInventory(request: {
    items: Array<{ pid: number; qty: number }>;
  }): Observable<ReservationResponse>;
  confirmInventoryReservation(request: {
    reservationId: string;
  }): Observable<ReservationResponse>;
  releaseInventoryReservation(request: {
    reservationId: string;
    reason: string;
  }): Observable<ReservationResponse>;
}

function toTestDatabaseUri(uri: string): string {
  const parsedUri = new URL(uri);
  parsedUri.pathname = '/product_db_e2e';

  return parsedUri.toString();
}

describe('ProductService gRPC (e2e)', () => {
  const grpcAddress = '127.0.0.1:55053';
  const protoPath = join(
    __dirname,
    '../../../packages/contracts/proto/product.proto',
  );

  let app: INestMicroservice;
  let client: ClientProxy;
  let service: ProductServiceClient;
  let databaseConnection: Connection;
  let originalMongoUri: string | undefined;

  beforeAll(async () => {
    originalMongoUri = process.env.MONGODB_URI;

    if (!originalMongoUri) {
      throw new Error('MONGODB_URI is required for Product Service E2E tests');
    }

    process.env.MONGODB_URI = toTestDatabaseUri(originalMongoUri);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'ecommerce.product.v1',
        protoPath,
        url: grpcAddress,
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    });

    await app.listen();

    databaseConnection = app.get<Connection>(getConnectionToken());
    await databaseConnection.dropDatabase();

    client = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'ecommerce.product.v1',
        protoPath,
        url: grpcAddress,
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    });

    service = (
      client as unknown as ClientGrpc
    ).getService<ProductServiceClient>('ProductService');
  }, 30_000);

  afterAll(async () => {
    if (databaseConnection) {
      await databaseConnection.dropDatabase();
    }

    client?.close();
    await app?.close();

    if (originalMongoUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = originalMongoUri;
    }
  });

  it('executes the complete product and inventory workflow', async () => {
    const created = await firstValueFrom(
      service.createProduct({
        pname: 'E2E Mechanical Keyboard',
        price: '129.90',
        quantity: 10,
      }),
    );

    expect(created.product).toMatchObject({
      pid: 1,
      pname: 'E2E Mechanical Keyboard',
      price: '129.90',
      quantity: 10,
      isActive: true,
    });

    const found = await firstValueFrom(
      service.getProduct({ pid: created.product.pid }),
    );
    expect(found.product).toEqual(created.product);

    const updated = await firstValueFrom(
      service.updateProduct({
        pid: created.product.pid,
        pname: 'E2E Keyboard Updated',
        price: '139.90',
        quantity: 12,
      }),
    );
    expect(updated.product).toMatchObject({
      pname: 'E2E Keyboard Updated',
      price: '139.90',
      quantity: 12,
    });

    const listed = await firstValueFrom(
      service.listProducts({ page: 1, pageSize: 20, search: 'Updated' }),
    );
    expect(listed).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(listed.products).toHaveLength(1);

    const releasedReservation = await firstValueFrom(
      service.reserveInventory({
        items: [{ pid: created.product.pid, qty: 2 }],
      }),
    );
    expect(releasedReservation.status).toBe(
      'INVENTORY_RESERVATION_STATUS_RESERVED',
    );

    await expect(
      firstValueFrom(
        service.releaseInventoryReservation({
          reservationId: releasedReservation.reservationId,
          reason: 'E2E release check',
        }),
      ),
    ).resolves.toMatchObject({
      status: 'INVENTORY_RESERVATION_STATUS_RELEASED',
    });

    const confirmedReservation = await firstValueFrom(
      service.reserveInventory({
        items: [{ pid: created.product.pid, qty: 3 }],
      }),
    );

    await expect(
      firstValueFrom(
        service.confirmInventoryReservation({
          reservationId: confirmedReservation.reservationId,
        }),
      ),
    ).resolves.toMatchObject({
      status: 'INVENTORY_RESERVATION_STATUS_CONFIRMED',
    });

    const afterReservation = await firstValueFrom(
      service.getProduct({ pid: created.product.pid }),
    );
    expect(afterReservation.product.quantity).toBe(9);

    await expect(
      firstValueFrom(service.deleteProduct({ pid: created.product.pid })),
    ).resolves.toEqual({ deleted: true });
  });
});
