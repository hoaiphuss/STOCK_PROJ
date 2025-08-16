// src/quotes/quote.controller.ts
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { mapQuoteToInternalFormat } from '../helpers/quote.helper';
import { Quote } from '../schemas/quote.schema';
import { exchangeToMarketId } from '../helpers/quote.map';

@Controller('/')
export class QuoteController {
  constructor(@InjectModel(Quote.name) private quoteModel: Model<Quote>) {}

  @Get('stocktradinginfo')
  async getStockTradingInfo(@Query('Code') symbol: string) {
    const quote = await this.quoteModel.findOne({ symbol }).lean();
    if (!quote)
      throw new NotFoundException(`Quote with symbol ${symbol} not found`);
    return mapQuoteToInternalFormat(quote);
  }

  @Get('stocktradinginfobyMarket_ID')
  async getTradingInfoByMarket(
    @Query('Market_ID') exchange = 'HOSE', // client truyền HOSE/HNX/UPCoM
    @Query('Page') page = 1,
    @Query('PageSize') pageSize = 10,
  ) {
    const skip = (page - 1) * Number(pageSize);

    // map exchange -> marketId
    const marketId = exchangeToMarketId[exchange] ?? 'MARKET_ID_STO';

    const [quotes, total] = await Promise.all([
      this.quoteModel
        .find({ marketId })
        .skip(skip)
        .limit(Number(pageSize))
        .lean(),
      this.quoteModel.countDocuments({ marketId }),
    ]);

    return quotes.map((q, idx) =>
      mapQuoteToInternalFormat(q, skip + idx + 1, total),
    );
  }
}
