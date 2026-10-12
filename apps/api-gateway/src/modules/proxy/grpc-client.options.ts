import { join } from 'node:path';
import { GrpcOptions, Transport } from '@nestjs/microservices';

export interface GrpcClientDefinition {
  packageName: string;
  protoFile: string;
  url: string;
}

export function createGrpcClientOptions(
  definition: GrpcClientDefinition,
): GrpcOptions {
  return {
    transport: Transport.GRPC,
    options: {
      package: definition.packageName,
      protoPath: join(
        __dirname,
        '../../../../../packages/contracts/proto',
        definition.protoFile,
      ),
      url: definition.url,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  };
}
