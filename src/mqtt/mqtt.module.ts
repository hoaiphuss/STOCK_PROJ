import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { QuoteModule } from '../quotes/quote.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [QuoteModule, AuthModule],
  providers: [MqttService],
})
export class MqttModule {}
