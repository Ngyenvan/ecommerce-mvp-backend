import { Module } from '@nestjs/common';
import { CustomerRepository } from '../../domain/customer/customer.repository';
import { MembershipRepository } from '../../domain/customer/membership.repository';
import { PrismaCustomerRepository } from './prisma-customer.repository';
import { PrismaMembershipRepository } from './prisma-membership.repository';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: CustomerRepository,
      useClass: PrismaCustomerRepository,
    },
    {
      provide: MembershipRepository,
      useClass: PrismaMembershipRepository,
    },
  ],
  exports: [CustomerRepository, MembershipRepository],
})
export class CustomerPersistenceModule {}
