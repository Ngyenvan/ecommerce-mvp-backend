import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { UsernameAlreadyExistsError } from '../src/application/auth/errors/registration.errors';
import { RegisterUserUseCase } from '../src/application/auth/use-cases/register-user.use-case';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('RegisterUserUseCase with PostgreSQL (e2e)', () => {
  const usernamePrefix = 'auth-e2e-';
  const registrationUsername = `${usernamePrefix}register`;
  const duplicateUsername = `${usernamePrefix}duplicate`;
  const password = 'StrongPassword123!';

  let app: INestApplication;
  let registerUser: RegisterUserUseCase;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    registerUser = app.get(RegisterUserUseCase);
    prisma = app.get(PrismaService);

    await prisma.user.deleteMany({
      where: {
        username: {
          startsWith: usernamePrefix,
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        username: {
          startsWith: usernamePrefix,
        },
      },
    });

    await app.close();
  });

  it('registers a CUSTOMER with a hashed password', async () => {
    const result = await registerUser.execute({
      username: `  ${registrationUsername.toUpperCase()}  `,
      password,
    });

    expect(result.username).toBe(registrationUsername);
    expect(result.role).toBe('CUSTOMER');

    const storedUser = await prisma.user.findUnique({
      where: {
        username: registrationUsername,
      },
      include: {
        role: true,
      },
    });

    expect(storedUser).not.toBeNull();
    expect(storedUser?.passwordHash).not.toBe(password);
    expect(storedUser?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(storedUser?.role.rolename).toBe('CUSTOMER');
  });

  it('rejects a duplicate username', async () => {
    await registerUser.execute({
      username: duplicateUsername,
      password,
    });

    await expect(
      registerUser.execute({
        username: duplicateUsername.toUpperCase(),
        password,
      }),
    ).rejects.toBeInstanceOf(UsernameAlreadyExistsError);
  });
});
