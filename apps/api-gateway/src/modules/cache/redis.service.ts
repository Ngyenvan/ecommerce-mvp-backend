import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import type { RedisClient } from './redis.constants';

@Injectable()
export class RedisService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: RedisClient,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }

    await this.client.ping();
    this.logger.log('Redis connection is ready');
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      this.logger.warn(`Removing malformed cache entry: ${key}`);
      await this.client.del(key);

      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    this.validateTtl(ttlSeconds);

    const serializedValue = JSON.stringify(value);

    if (serializedValue === undefined) {
      throw new Error('Redis cache value cannot be undefined');
    }

    await this.client.set(key, serializedValue, {
      EX: ttlSeconds,
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    this.validateTtl(ttlSeconds);

    const script = `
      local current = redis.call('INCR', KEYS[1])

      if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end

      return current
    `;

    const result = await this.client.eval(script, {
      keys: [key],
      arguments: [String(ttlSeconds)],
    });

    const count = Number(result);

    if (!Number.isFinite(count)) {
      throw new Error('Redis returned an invalid counter value');
    }

    return count;
  }

  private validateTtl(ttlSeconds: number): void {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('Redis TTL must be a positive integer');
    }
  }
}
