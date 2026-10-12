import { Module } from '@nestjs/common';
import { CustomerPersistenceModule } from '../../infrastructure/database/customer-persistence.module';
import { AdjustCustomerScoreUseCase } from './use-cases/adjust-customer-score.use-case';
import { CreateCustomerUseCase } from './use-cases/create-customer.use-case';
import { CreateMembershipTierUseCase } from './use-cases/create-membership-tier.use-case';
import { GetCustomerMembershipUseCase } from './use-cases/get-customer-membership.use-case';
import { GetCustomerUseCase } from './use-cases/get-customer.use-case';
import { ListMembershipTiersUseCase } from './use-cases/list-membership-tiers.use-case';
import { UpdateCustomerUseCase } from './use-cases/update-customer.use-case';
import { UpdateMembershipTierUseCase } from './use-cases/update-membership-tier.use-case';

const customerUseCases = [
  CreateCustomerUseCase,
  GetCustomerUseCase,
  UpdateCustomerUseCase,
  GetCustomerMembershipUseCase,
  AdjustCustomerScoreUseCase,
  ListMembershipTiersUseCase,
  CreateMembershipTierUseCase,
  UpdateMembershipTierUseCase,
];

@Module({
  imports: [CustomerPersistenceModule],
  providers: customerUseCases,
  exports: customerUseCases,
})
export class CustomerApplicationModule {}
