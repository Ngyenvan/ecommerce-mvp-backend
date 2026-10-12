import { RedisService } from '../cache/redis.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports an operational Redis dependency', async () => {
    const redis = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    const controller = new HealthController(redis as unknown as RedisService);

    await expect(controller.check()).resolves.toMatchObject({
      status: 'ok',
      service: 'api-gateway',
      dependencies: {
        redis: 'up',
      },
    });
  });
});
