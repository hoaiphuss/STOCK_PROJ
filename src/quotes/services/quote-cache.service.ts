import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Quote } from '../schemas/quote.schema';

interface CachedQuote {
  data: Quote;
  updatedAt: number;
}

@Injectable()
export class QuoteCacheService {
  private readonly logger = new Logger(QuoteCacheService.name);
  private latestCache = new Map<string, CachedQuote>();
  private cacheTTL = 5 * 60 * 1000; // 5 phút

  /** Lấy cache hiện tại */
  get(symbol: string): Quote | undefined {
    return this.latestCache.get(symbol)?.data;
  }

  /** Lưu vào cache */
  set(symbol: string, data: Quote) {
    this.latestCache.set(symbol, { data, updatedAt: Date.now() });
  }

  /** Cleanup cache hết hạn */
  cleanupCache() {
    const now = Date.now();
    let removed = 0;
    for (const [symbol, { updatedAt }] of this.latestCache.entries()) {
      if (now - updatedAt > this.cacheTTL) {
        this.latestCache.delete(symbol);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} stale cache entries`);
    }
  }

  /** Cron job: dọn cache mỗi 30 phút */
  @Cron(CronExpression.EVERY_30_MINUTES)
  handleCacheCleanup() {
    this.cleanupCache();
  }
}
