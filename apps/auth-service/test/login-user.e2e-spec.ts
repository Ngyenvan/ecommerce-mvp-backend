import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { InvalidCredentialsError } from '../src/application/auth/errors/login.errors';
import { LoginUserUseCase } from '../src/application/auth/use-cases/login-user.use-case';
import { RegisterUserUseCase } from '../src/application/auth/use-cases/register-user.use-case';
import {
  JWT_AUDIENCE,
  JWT_ISSUER,
} from '../src/infrastructure/security/jwt-access-token-issuer';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('LoginUserUseCase with PostgreSQL (e2e)', () => {
  const usernamePrefix = 'auth-e2e-login-';
  const successUsername = `${usernamePrefix}success`;
  const failureUsername = `${usernamePrefix}failure`;
  const password = 'StrongPassword123!';

  let app: INestApplication;
  let registerUser: RegisterUserUseCase;
  let loginUser: LoginUserUseCase;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    registerUser = app.get(RegisterUserUseCase);
    loginUser = app.get(LoginUserUseCase);
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

  it('logs in and issues a verifiable JWT', async () => {
    await registerUser.execute({
      username: successUsername,
      password,
    });

    const result = await loginUser.execute({
      username: successUsername,
      password,
    });

    expect(result.tokenType).toBe('Bearer');
    expect(result.expiresInSeconds).toBe(900);
    expect(result.user.username).toBe(successUsername);
    expect(result.user.role).toBe('CUSTOMER');

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is unavailable');
    }

    const verifier = new JwtService({ secret });

    const payload = await verifier.verifyAsync<{
      sub: string;
      username: string;
      role: string;
    }>(result.accessToken, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    expect(payload.sub).toBe(String(result.user.uid));
    expect(payload.username).toBe(successUsername);
    expect(payload.role).toBe('CUSTOMER');

    const storedUser = await prisma.user.findUnique({
      where: {
        username: successUsername,
      },
    });

    expect(storedUser?.lastLoginAt).toBeInstanceOf(Date);
  });

  it('rejects an incorrect password', async () => {
    await registerUser.execute({
      username: failureUsername,
      password,
    });

    await expect(
      loginUser.execute({
        username: failureUsername,
        password: 'WrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
