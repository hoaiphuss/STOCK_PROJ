import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MqttModule } from './mqtt/mqtt.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { MqttService } from './mqtt/mqtt.service';
import { QuoteModule } from './quotes/quote.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URL'),
      }),
      inject: [ConfigService],
    }),
    MqttModule,
    ConfigModule.forRoot({ isGlobal: true }),
    QuoteModule,
    AuthModule,
    ScheduleModule.forRoot()
  ],
  providers: [MqttService],
})
export class AppModule {}
