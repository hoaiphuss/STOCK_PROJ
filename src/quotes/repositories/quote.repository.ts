import { Injectable, Logger } from '@nestjs/common';
import { Quote } from '../schemas/quote.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { QuoteGateway } from '../socket/quote.gateway';
import { QuoteCacheService } from '../services/quote-cache.service';

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
    private readonly quoteCache: QuoteCacheService,
  ) {}

  async saveQuoteIfChanged(data: Partial<Quote>) {
    const symbol = data.symbol;
    if (!symbol) return;

    const cached = this.quoteCache.get(symbol);

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
    this.quoteCache.set(symbol, data as Quote);

    // Gửi realtime tới FE
    this.quoteGateway.sendQuoteUpdate(data);
    this.logger.debug(`Updated quote for ${symbol}`);
  }
}
