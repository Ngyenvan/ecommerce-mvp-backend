import { AuthController } from './auth.controller';
import { AuthGatewayService } from './auth-gateway.service';

describe('AuthController', () => {
  const authGateway = {
    register: jest.fn(),
    login: jest.fn(),
    getUser: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.resetAllMocks();

    controller = new AuthController(
      authGateway as unknown as AuthGatewayService,
    );
  });

  it('registers a user', async () => {
    const result = {
      user: {
        uid: 1,
        username: 'customer',
        role: 'CUSTOMER',
      },
    };

    authGateway.register.mockResolvedValue(result);

    await expect(
      controller.register({
        username: 'customer',
        password: 'password123',
      }),
    ).resolves.toEqual(result);
  });

  it('logs in a user', async () => {
    const result = {
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresInSeconds: 900,
      user: {
        uid: 1,
        username: 'customer',
        role: 'CUSTOMER',
      },
    };

    authGateway.login.mockResolvedValue(result);

    await expect(
      controller.login({
        username: 'customer',
        password: 'password123',
      }),
    ).resolves.toEqual(result);
  });

  it('gets the current authenticated user', async () => {
    const result = {
      user: {
        uid: 1,
        username: 'customer',
        role: 'CUSTOMER' as const,
      },
    };

    authGateway.getUser.mockResolvedValue(result);

    await expect(controller.getCurrentUser(result.user)).resolves.toEqual(
      result,
    );

    expect(authGateway.getUser).toHaveBeenCalledWith(1);
  });
});
