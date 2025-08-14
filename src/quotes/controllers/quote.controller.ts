// src/quotes/quote.controller.ts
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { mapQuoteToInternalFormat } from '../helpers/quote.helper';
import { Quote } from '../schemas/quote.schema';

@Controller('quotes')
export class QuoteController {
  constructor(@InjectModel(Quote.name) private quoteModel: Model<Quote>) {}

  @Get()
  async getAllQuotes() {
    return this.quoteModel.find();
  }

  @Get(':symbol')
  async getQuote(@Param('symbol') symbol: string) {
    const quote = await this.quoteModel.findOne({ symbol }).lean();
    if (!quote) throw new NotFoundException();

    return mapQuoteToInternalFormat(quote);
  }
}
