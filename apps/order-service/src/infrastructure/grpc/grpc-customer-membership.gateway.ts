import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  CustomerMembershipGateway,
  CustomerMembershipSnapshot,
} from '../../application/order/ports/customer-membership.gateway';
import { CUSTOMER_GRPC_CLIENT } from './grpc-client.tokens';
import { toDownstreamServiceError } from './grpc-downstream.errors';

interface CustomerMembershipResponse {
  uid: number;
  score: number;
  membership: {
    discountPercent: string;
  };
}

interface CustomerServiceClient {
  getCustomerMembership(request: {
    uid: number;
  }): Observable<CustomerMembershipResponse>;
}

@Injectable()
export class GrpcCustomerMembershipGateway
  implements CustomerMembershipGateway, OnModuleInit
{
  private customerService!: CustomerServiceClient;

  constructor(
    @Inject(CUSTOMER_GRPC_CLIENT) private readonly client: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.customerService =
      this.client.getService<CustomerServiceClient>('CustomerService');
  }

  async getMembership(uid: number): Promise<CustomerMembershipSnapshot> {
    try {
      const response = await firstValueFrom(
        this.customerService.getCustomerMembership({ uid }),
      );

      return {
        uid: response.uid,
        score: response.score,
        discountPercent: response.membership.discountPercent,
      };
    } catch (error: unknown) {
      throw toDownstreamServiceError('Customer Service', error);
    }
  }
}
