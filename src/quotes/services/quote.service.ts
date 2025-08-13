import { Inject, Injectable } from '@nestjs/common';
import { QuoteRepository } from '../repositories/quote.repository';
import { Quote } from '../schemas/quote.schema';

@Injectable()
export class QuoteService {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async saveQuoteIfChanged(data: Partial<Quote>) {
    return this.quoteRepository.saveQuoteIfChanged(data);
  }
}
