import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');

        if (!uri) {
          throw new Error('MONGODB_URI is not configured');
        }

        return {
          uri,
          serverSelectionTimeoutMS: 5000,
          maxPoolSize: 10,
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class ProductMongoModule {}
