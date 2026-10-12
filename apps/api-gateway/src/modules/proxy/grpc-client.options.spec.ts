import { Transport } from '@nestjs/microservices';
import { createGrpcClientOptions } from './grpc-client.options';

describe('createGrpcClientOptions', () => {
  it('creates a gRPC client configuration', () => {
    const result = createGrpcClientOptions({
      packageName: 'ecommerce.auth.v1',
      protoFile: 'auth.proto',
      url: 'localhost:50051',
    });

    expect(result.transport).toBe(Transport.GRPC);

    expect(result.options).toMatchObject({
      package: 'ecommerce.auth.v1',
      url: 'localhost:50051',
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    });

    expect(result.options.protoPath).toEqual(
      expect.stringMatching(
        /packages[\\/]contracts[\\/]proto[\\/]auth\.proto$/,
      ),
    );
  });

  it.each([
    ['auth.proto', 'ecommerce.auth.v1', 'localhost:50051'],
    ['customer.proto', 'ecommerce.customer.v1', 'localhost:50052'],
    ['product.proto', 'ecommerce.product.v1', 'localhost:50053'],
    ['order.proto', 'ecommerce.order.v1', 'localhost:50054'],
    ['shipment.proto', 'ecommerce.shipment.v1', 'localhost:50055'],
  ])('supports %s', (protoFile, packageName, url) => {
    const result = createGrpcClientOptions({
      protoFile,
      packageName,
      url,
    });

    expect(result.options).toMatchObject({
      package: packageName,
      url,
    });
  });
});
