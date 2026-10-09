const fs = require('node:fs');
const path = require('node:path');
const protoLoader = require('@grpc/proto-loader');

const contractsRoot = path.resolve(__dirname, '..');
const protoDirectory = path.join(contractsRoot, 'proto');

const requiredDefinitions = {
  'auth.proto': [
    'ecommerce.auth.v1.AuthService',
    'ecommerce.auth.v1.RegisterRequest',
    'ecommerce.auth.v1.LoginResponse',
  ],
  'customer.proto': [
    'ecommerce.customer.v1.CustomerService',
    'ecommerce.customer.v1.Customer',
    'ecommerce.customer.v1.MembershipTier',
  ],
  'product.proto': [
    'ecommerce.product.v1.ProductService',
    'ecommerce.product.v1.Product',
    'ecommerce.product.v1.InventoryReservationStatus',
  ],
  'order.proto': [
    'ecommerce.order.v1.OrderService',
    'ecommerce.order.v1.Order',
    'ecommerce.order.v1.OrderStatus',
  ],
  'shipment.proto': [
    'ecommerce.shipment.v1.ShipmentService',
    'ecommerce.shipment.v1.Shipment',
    'ecommerce.shipment.v1.ShipmentStatus',
  ],
};

for (const [fileName, expectedNames] of Object.entries(requiredDefinitions)) {
  const protoPath = path.join(protoDirectory, fileName);

  if (!fs.existsSync(protoPath)) {
    throw new Error(`Missing contract: ${fileName}`);
  }

  const definition = protoLoader.loadSync(protoPath);

  for (const expectedName of expectedNames) {
    if (!definition[expectedName]) {
      throw new Error(
        `${fileName} does not define ${expectedName}`,
      );
    }
  }

  console.log(`PASS ${fileName}`);
}

const eventSchemaPath = path.join(
  contractsRoot,
  'events',
  'order-created.v1.schema.json',
);

const eventSchema = JSON.parse(
  fs.readFileSync(eventSchemaPath, 'utf8'),
);

if (eventSchema.title !== 'OrderCreatedV1') {
  throw new Error('Invalid OrderCreated event title');
}

if (eventSchema.properties.event_type.const !== 'order.created') {
  throw new Error('Invalid OrderCreated event type');
}

if (eventSchema.properties.event_version.const !== 1) {
  throw new Error('Invalid OrderCreated event version');
}

const requiredEventFields = [
  'event_id',
  'event_type',
  'event_version',
  'occurred_at',
  'correlation_id',
  'data',
];

for (const field of requiredEventFields) {
  if (!eventSchema.required.includes(field)) {
    throw new Error(`OrderCreated is missing required field: ${field}`);
  }
}

console.log('PASS order-created.v1.schema.json');
console.log('All contracts are valid.');
