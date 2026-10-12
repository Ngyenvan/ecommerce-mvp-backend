const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('node:path');

const protoPath = path.join(
  __dirname,
  '../../../packages/contracts/proto/customer.proto',
);

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const descriptor = grpc.loadPackageDefinition(packageDefinition);

const CustomerService = descriptor.ecommerce.customer.v1.CustomerService;

const client = new CustomerService(
  '127.0.0.1:50052',
  grpc.credentials.createInsecure(),
);

const deadline = new Date(Date.now() + 5000);

client.listMembershipTiers({}, { deadline }, (error, response) => {
  client.close();

  if (error) {
    console.error('SMOKE TEST FAILED');
    console.error(error);
    process.exitCode = 1;
    return;
  }

  const memberships = response.memberships ?? [];

  console.table(memberships);

  const expectedMemberships = [
    {
      name: 'BRONZE',
      minScore: 0,
      discountPercent: '0.00',
    },
    {
      name: 'SILVER',
      minScore: 1000,
      discountPercent: '5.00',
    },
    {
      name: 'GOLD',
      minScore: 5000,
      discountPercent: '10.00',
    },
  ];

  const isValid =
    memberships.length === expectedMemberships.length &&
    expectedMemberships.every(
      (expected, index) =>
        memberships[index].name === expected.name &&
        memberships[index].minScore === expected.minScore &&
        memberships[index].discountPercent === expected.discountPercent,
    );

  if (!isValid) {
    console.error('SMOKE TEST FAILED: membership data is incorrect');
    process.exitCode = 1;
    return;
  }

  console.log('SMOKE TEST PASSED: Customer gRPC and PostgreSQL are working');
});
