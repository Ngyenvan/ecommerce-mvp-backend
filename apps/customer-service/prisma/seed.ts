import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const memberships = [
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

async function main(): Promise<void> {
  for (const membership of memberships) {
    await prisma.membership.upsert({
      where: { name: membership.name },
      update: {
        minScore: membership.minScore,
        discountPercent: membership.discountPercent,
      },
      create: membership,
    });
  }

  console.log(
    `Seeded memberships: ${memberships
      .map((membership) => membership.name)
      .join(', ')}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
