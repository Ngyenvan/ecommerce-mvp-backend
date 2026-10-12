import type { RedisClient } from './redis.constants';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  const redisMock = {
    isOpen: false,
    connect: jest.fn(),
    quit: jest.fn(),
    ping: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
  };

  let service: RedisService;

  beforeEach(() => {
    jest.resetAllMocks();
    redisMock.isOpen = false;
    redisMock.connect.mockResolvedValue(undefined);
    redisMock.quit.mockResolvedValue('OK');
    redisMock.ping.mockResolvedValue('PONG');
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue('OK');
    redisMock.del.mockResolvedValue(1);
    redisMock.eval.mockResolvedValue(1);

    service = new RedisService(redisMock as unknown as RedisClient);
  });

  it('connects and checks Redis during application startup', async () => {
    await service.onApplicationBootstrap();

    expect(redisMock.connect).toHaveBeenCalledTimes(1);
    expect(redisMock.ping).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect an open Redis client', async () => {
    redisMock.isOpen = true;

    await service.onApplicationBootstrap();

    expect(redisMock.connect).not.toHaveBeenCalled();
    expect(redisMock.ping).toHaveBeenCalledTimes(1);
  });

  it('stores and reads JSON values', async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({
        pid: 101,
        pname: 'Keyboard',
      }),
    );

    await service.setJson(
      'product:101',
      {
        pid: 101,
        pname: 'Keyboard',
      },
      60,
    );

    await expect(
      service.getJson<{ pid: number; pname: string }>('product:101'),
    ).resolves.toEqual({
      pid: 101,
      pname: 'Keyboard',
    });

    expect(redisMock.set).toHaveBeenCalledWith(
      'product:101',
      JSON.stringify({
        pid: 101,
        pname: 'Keyboard',
      }),
      {
        EX: 60,
      },
    );
  });

  it('removes malformed JSON cache entries', async () => {
    redisMock.get.mockResolvedValue('{invalid-json');

    await expect(service.getJson('invalid-entry')).resolves.toBeNull();

    expect(redisMock.del).toHaveBeenCalledWith('invalid-entry');
  });

  it('deletes a cache entry', async () => {
    await service.delete('product:101');

    expect(redisMock.del).toHaveBeenCalledWith('product:101');
  });

  it('increments a counter and applies its expiry atomically', async () => {
    redisMock.eval.mockResolvedValue(4);

    await expect(
      service.incrementWithTtl('rate-limit:127.0.0.1', 60),
    ).resolves.toBe(4);

    expect(redisMock.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: ['rate-limit:127.0.0.1'],
      arguments: ['60'],
    });
  });

  it('rejects an invalid TTL', async () => {
    await expect(
      service.setJson('product:101', { pid: 101 }, 0),
    ).rejects.toThrow('Redis TTL must be a positive integer');
  });

  it('closes an open Redis connection', async () => {
    redisMock.isOpen = true;

    await service.onApplicationShutdown();

    expect(redisMock.quit).toHaveBeenCalledTimes(1);
  });
});
