import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  NotFoundException,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import { AuthService } from '../auth/auth.service';
import { Quote } from 'src/quotes/schemas/quote.schema';
import { QuoteService } from 'src/quotes/services/quote.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient | null = null;
  private lastMessageTime = Date.now();

  // timers
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private dailyReconnectTimer: NodeJS.Timeout | null = null;

  // backoff config
  private reconnectDelay = 5000; // 5s start
  private readonly reconnectMaxDelay = 60000; // 60s max

  constructor(
    private readonly quoteService: QuoteService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.connectToBroker();
    this.startHealthCheck();
    this.startDailyReconnect();
  }

  async onModuleDestroy() {
    this.stopHealthCheck();
    this.stopDailyReconnect();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.client?.end(true);
  }

  /** Check nếu không nhận message trong 30s → reconnect */
  private startHealthCheck() {
    const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 tiếng
    const MAX_IDLE = 12 * 60 * 60 * 1000; // 12 tiếng

    this.healthCheckInterval = setInterval(() => {
      const diff = Date.now() - this.lastMessageTime;
      if (diff > MAX_IDLE) {
        console.warn('⚠️ No MQTT messages for 12h, reconnecting...');
        this.forceReconnect();
      } else {
        console.log(
          `⏳ Health check: last message ${Math.round(diff / 1000 / 60)} phút trước`,
        );
      }
    }, CHECK_INTERVAL);
  }

  private stopHealthCheck() {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
  }

  /** Reconnect định kỳ 24h */
  private startDailyReconnect() {
    this.dailyReconnectTimer = setInterval(
      () => {
        console.log('🕛 Daily reconnect triggered');
        this.forceReconnect();
      },
      24 * 60 * 60 * 1000,
    ); // 24h
  }

  private stopDailyReconnect() {
    if (this.dailyReconnectTimer) clearInterval(this.dailyReconnectTimer);
  }

  /** Force disconnect & connect lại */
  private async forceReconnect() {
    try {
      this.client?.end(true);
    } catch {}
    await this.connectToBroker();
  }

  /** Connect đến broker */
  private async connectToBroker() {
    try {
      const { token, investorId } = await this.authService.getValidToken();
      const brokerUrl = this.configService.get<string>('BROKEN_URL');
      if (!brokerUrl) throw new NotFoundException('No broker URL provided');

      const clientId = `${this.configService.get<string>('CLIENT_ID')}-${Math.floor(
        Math.random() * 10000,
      )}`;

      this.client = mqtt.connect(brokerUrl, {
        clientId,
        username: investorId,
        password: token,
        rejectUnauthorized: false,
        protocol: 'wss',
        reconnectPeriod: 0, // tự quản lý reconnect
      });

      this.registerEvents();

      // reset delay về mức ban đầu khi connect thành công
      this.reconnectDelay = 5000;
    } catch (err) {
      console.error('❌ Error connecting to MQTT broker:', err.message);
      this.scheduleReconnect();
    }
  }

  /** Xử lý sự kiện MQTT */
  private registerEvents() {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('✅ MQTT connected');
      this.client!.subscribe(this.configService.get<string>('TOPIC') || '');
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

    this.client.on('message', async (_, message) => {
      this.lastMessageTime = Date.now();
      try {
        const raw = JSON.parse(message.toString());
        const cleaned = this.normalizeQuote(raw);
        await this.quoteService.saveQuoteIfChanged(cleaned);
      } catch (err) {
        console.error('📛 Error processing message:', err.message);
      }
    });
  }

  /** Lịch reconnect có backoff */
  /** Lịch reconnect với exponential backoff + jitter */
  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    // thêm jitter (random từ 0 đến 1/2 delay)
    const jitter = Math.floor(Math.random() * (this.reconnectDelay / 2));
    const delay = this.reconnectDelay + jitter;

    console.log(`🔄 Reconnecting in ~${Math.round(delay / 1000)}s...`);

    this.reconnectTimer = setTimeout(() => this.connectToBroker(), delay);

    // tăng delay gấp đôi nhưng max 15 phút
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      15 * 60 * 1000, // 15 phút
    );
  }

  private normalizeQuote(raw: any): Partial<Quote> {
    const toNumber = (val: any) => {
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
