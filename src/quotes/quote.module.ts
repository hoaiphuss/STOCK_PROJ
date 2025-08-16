import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Quote, QuoteSchema } from './schemas/quote.schema';
import { QuoteRepository } from './repositories/quote.repository'; // <- THÊM DÒNG NÀY
import { QuoteController } from './controllers/quote.controller';
import { QuoteGateway } from './socket/quote.gateway';
import { QuoteService } from './services/quote.service';
import { QuoteCacheService } from './services/quote-cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quote.name, schema: QuoteSchema }]),
  ],
  controllers: [QuoteController],
  providers: [QuoteService, QuoteGateway, QuoteRepository, QuoteCacheService],
  exports: [QuoteService],
})
export class QuoteModule {}
