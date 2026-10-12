import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { status } from '@grpc/grpc-js';

interface GrpcError {
  code?: number;
  details?: string;
  message?: string;
}

export function throwMappedGrpcError(error: unknown): never {
  const grpcError = toGrpcError(error);
  const message =
    grpcError.details ??
    grpcError.message ??
    'Downstream service request failed';

  switch (grpcError.code) {
    case status.INVALID_ARGUMENT:
      throw new BadRequestException(message);

    case status.UNAUTHENTICATED:
      throw new UnauthorizedException(message);

    case status.PERMISSION_DENIED:
      throw new ForbiddenException(message);

    case status.NOT_FOUND:
      throw new NotFoundException(message);

    case status.ALREADY_EXISTS:
      throw new ConflictException(message);

    case status.FAILED_PRECONDITION:
      throw new UnprocessableEntityException(message);

    case status.RESOURCE_EXHAUSTED:
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);

    case status.DEADLINE_EXCEEDED:
      throw new GatewayTimeoutException(message);

    case status.UNAVAILABLE:
      throw new ServiceUnavailableException(
        'Downstream service is unavailable',
      );

    default:
      throw new InternalServerErrorException('Internal server error');
  }
}

function toGrpcError(error: unknown): GrpcError {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  const candidate = error as {
    code?: unknown;
    details?: unknown;
    message?: unknown;
  };

  return {
    code: typeof candidate.code === 'number' ? candidate.code : undefined,
    details:
      typeof candidate.details === 'string' ? candidate.details : undefined,
    message:
      typeof candidate.message === 'string' ? candidate.message : undefined,
  };
}
