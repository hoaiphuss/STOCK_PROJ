import { Injectable, Logger } from '@nestjs/common';
import { Quote } from '../schemas/quote.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { QuoteGateway } from '../socket/quote.gateway';

interface CachedQuote {
  data: Quote;
  updatedAt: number;
}

@Injectable()
export class QuoteRepository {
  private readonly logger = new Logger(QuoteRepository.name);
  private latestCache = new Map<string, CachedQuote>();
  private cacheTTL = 5 * 60 * 1000; // 5 phút

  constructor(
    @InjectModel(Quote.name) private readonly quoteModel: Model<Quote>,
    private readonly quoteGateway: QuoteGateway,
  ) {}

  async saveQuoteIfChanged(data: Partial<Quote>) {
    const symbol = data.symbol;
    if (!symbol) return;

    const cached = this.latestCache.get(symbol)?.data;

    // So sánh các trường quan trọng
    const isChanged =
      !cached ||
      cached.matchPrice !== data.matchPrice ||
      cached.totalVolumeTraded !== data.totalVolumeTraded ||
      cached.matchQuantity !== data.matchQuantity ||
      cached.changedValue !== data.changedValue ||
      cached.changedRatio !== data.changedRatio;

    if (!isChanged) return;

    // Update DB
    await this.quoteModel.updateOne(
      { symbol },
      { $set: data },
      { upsert: true },
    );

    // Cập nhật cache
    this.latestCache.set(symbol, {
      data: data as Quote,
      updatedAt: Date.now(),
    });

    // Gửi realtime tới FE
    this.quoteGateway.sendQuoteUpdate(data);

    this.logger.debug(`Updated quote for ${symbol}`);
  }

  /** Dọn cache quá cũ để tránh memory leak */
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
}
