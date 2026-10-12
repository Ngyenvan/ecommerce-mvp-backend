import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const adminUsername = (process.env.ADMIN_USERNAME ?? '').trim().toLowerCase();

const adminPassword = process.env.ADMIN_PASSWORD ?? '';

if (adminUsername.length < 3 || adminUsername.length > 50) {
  throw new Error('ADMIN_USERNAME must contain between 3 and 50 characters');
}

if (adminPassword.length < 8 || Buffer.byteLength(adminPassword, 'utf8') > 72) {
  throw new Error('ADMIN_PASSWORD must contain between 8 and 72 bytes');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const roles = ['CUSTOMER', 'ADMIN'];

async function main(): Promise<void> {
  for (const rolename of roles) {
    await prisma.role.upsert({
      where: {
        rolename,
      },
      update: {},
      create: {
        rolename,
      },
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: {
      rolename: 'ADMIN',
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: {
      username: adminUsername,
    },
    update: {
      passwordHash,
      roleid: adminRole.roleid,
      isActive: true,
    },
    create: {
      username: adminUsername,
      passwordHash,
      roleid: adminRole.roleid,
      isActive: true,
    },
  });

  console.log(`Seeded roles: ${roles.join(', ')}`);
  console.log(`Seeded admin account: ${adminUsername}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
