import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SharedBullConfigurationFactory } from '@nestjs/bullmq';
// import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ConnectionOptions } from 'bullmq';

@Injectable()
export class BullMQConfigService implements SharedBullConfigurationFactory {
  constructor(private readonly configService: ConfigService) {}

  createSharedConfiguration() {
    return {
      connection: this.getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5_000, // 5s, 10s, 20s
        },
        removeOnComplete: { count: 500 }, // Keep last 500 completed jobs
        removeOnFail: { count: 200 }, // Keep last 200 failed jobs for inspection
      },
    };
  }

  getConnection(): ConnectionOptions {
    const host = this.configService.get<string>('redis.host') ?? 'localhost';
    const isTlsHost = host !== 'localhost' && host !== '127.0.0.1';

    return {
      host: this.configService.get<string>('QUEUE_REDIS_HOST') ?? 'localhost',
      port: this.configService.get<number>('QUEUE_REDIS_PORT') ?? 6379,
      password:
        this.configService.get<string>('QUEUE_REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('QUEUE_REDIS_DB') ?? 1,
      enableReadyCheck: false,
      tls: isTlsHost ? {} : undefined,
      retryStrategy: (times) => {
        if (times > 10) {
          console.log('Redis connection failed after 10 retries');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    };
  }
}
