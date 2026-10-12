import { DownstreamServiceError } from '../../application/order/errors/order-application.errors';

interface GrpcErrorLike {
  code?: number;
  details?: string;
  message?: string;
}

export function toDownstreamServiceError(
  serviceName: 'Customer Service' | 'Product Service',
  error: unknown,
): DownstreamServiceError {
  const grpcError = error as GrpcErrorLike;

  return new DownstreamServiceError(
    serviceName,
    grpcError.code,
    grpcError.details ?? grpcError.message ?? `${serviceName} request failed`,
  );
}
