import {
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { throwMappedGrpcError } from './grpc-error.mapper';

describe('throwMappedGrpcError', () => {
  it('maps ALREADY_EXISTS to HTTP conflict', () => {
    expect(() =>
      throwMappedGrpcError({
        code: status.ALREADY_EXISTS,
        details: 'Username already exists',
      }),
    ).toThrow(ConflictException);
  });

  it('maps UNAUTHENTICATED to HTTP unauthorized', () => {
    expect(() =>
      throwMappedGrpcError({
        code: status.UNAUTHENTICATED,
        details: 'Invalid credentials',
      }),
    ).toThrow(UnauthorizedException);
  });

  it('maps UNAVAILABLE to service unavailable', () => {
    expect(() =>
      throwMappedGrpcError({
        code: status.UNAVAILABLE,
      }),
    ).toThrow(ServiceUnavailableException);
  });
});
