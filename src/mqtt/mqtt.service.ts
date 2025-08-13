import { Injectable, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { AuthService } from '../auth/auth.service';
import { Quote } from 'src/quotes/schemas/quote.schema';
import { QuoteService } from 'src/quotes/services/quote.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient | null = null;
  private reconnectDelay = 5000; // 5s
  private lastMessageTime = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly quoteService: QuoteService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  // Khi module khởi tạo:
  // Kết nối broker một lần, rồi bật health check định kỳ.
  async onModuleInit() {
    await this.connectToBroker();
    this.startHealthCheck();
  }

  // Khi App tắt:
  // Clear Interval + đóng Socket MQTT (force close với true)
  async onModuleDestroy() {
    this.stopHealthCheck();
    this.client?.end(true);
  }

  // Mục đích: có những trường hợp "kênh đứng" nhưng không phát sinh error/close
  // Nếu 30s không thấy message nào -> đóng kết nối + connect lại (có token mới)
  // Mỗi 10s kiểm tra một lần
  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      const diff = Date.now() - this.lastMessageTime;
      if (diff > 30000) {
        console.warn('⚠️ No MQTT messages for 30s, reconnecting...');
        this.client?.end(true);
        this.connectToBroker();
      }
    }, 10000);
  }

  // Dọn dẹp interval khi destroy
  private stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async connectToBroker() {
    try {
      const { token, investorId } = await this.authService.getValidToken();
      const brokerUrl = this.configService.get<string>('BROKEN_URL');

      if (!brokerUrl) throw new NotFoundException('Do not have any broker url !');
      
      const clientId = `${this.configService.get<string>('CLIENT_ID')}-${Math.floor(
        Math.random() * 1000 + 1000,
      )}`;

      this.client = mqtt.connect(brokerUrl, {
        clientId,
        username: investorId,
        password: token,
        rejectUnauthorized: false,
        protocol: 'wss',
        reconnectPeriod: 0, // Tự quản lý reconnect
      });

      this.registerEvents();
    } catch (err) {
      console.error('❌ Error connecting to MQTT broker:', err);
      this.scheduleReconnect();
    }
  }

  private registerEvents() {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('✅ MQTT connected');
      this.client!.subscribe(
        `${this.configService.get<string>('TOPIC')}`,
      );
    });

    this.client.on('close', () => {
      console.warn('⚠️ MQTT connection closed');
      this.scheduleReconnect();
    });

    this.client.on('offline', () => {
      console.warn('📡 MQTT offline');
    });

    this.client.on('error', (err) => {
      console.error('❌ MQTT Error:', err.message);
      this.client?.end(true);
    });

    this.client.on('message', async (topic, message) => {
      this.lastMessageTime = Date.now();
      try {
        const raw = JSON.parse(message.toString());
        const cleaned = this.normalizeQuote(raw);
        await this.quoteService.saveQuoteIfChanged(cleaned);
      } catch (err) {
        console.error('📛 Error processing message:', err);
      }
    });
  }

  // Đơn giản: chờ 5s rồi gọi connectToBroker() (sẽ tự xin token mới)
  // Có thể nâng cấp thành exponential backoff (ví dụ 1s, 2s, 3s, tối đa 30s)
  private scheduleReconnect() {
    console.log(`🔄 Reconnecting in ${this.reconnectDelay / 1000}s...`);
    setTimeout(() => this.connectToBroker(), this.reconnectDelay);
  }

  // Chuyển các field về number nếu hợp lệ, ngược lại trả về undefined
  // Điều này giúp dữ liệu nhất quán khi lưu DB.
  private normalizeQuote(raw: any): Partial<Quote> {
    const toNumber = (val: any): number | undefined => {
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    };

    return {
      ...raw,
      matchPrice: toNumber(raw.matchPrice),
      matchQuantity: toNumber(raw.matchQuantity),
      totalVolumeTraded: toNumber(raw.totalVolumeTraded),
      listedShares: toNumber(raw.listedShares),
      referencePrice: toNumber(raw.referencePrice),
      openPrice: toNumber(raw.openPrice),
      closePrice: toNumber(raw.closePrice),
      averagePrice: toNumber(raw.averagePrice),
      highLimitPrice: toNumber(raw.highLimitPrice),
      lowLimitPrice: toNumber(raw.lowLimitPrice),
      changedValue: toNumber(raw.changedValue),
      changedRatio: toNumber(raw.changedRatio),
    };
  }
}
