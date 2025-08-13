import { Quote } from '../quotes/schemas/quote.schema';

export function mapVietstockToQuote(data: any): Partial<Quote> {
  return {
    symbol: data.symbol || '',
    tradingTime: new Date(data.tradingTime), // nếu schema dùng string
    listedShares: data.listedShares ?? null,
    referencePrice: data.referencePrice ?? null,
    highLimitPrice: data.highLimitPrice ?? null,
    lowLimitPrice: data.lowLimitPrice ?? null,
    totalVolumeTraded: data.totalVolumeTraded ?? null,
    matchValue: data.matchValue ?? null,
    highestPrice: data.highestPrice ?? null,
    lowestPrice: data.lowestPrice ?? null,
    openPrice: data.openPrice ?? null,
    matchPrice: data.matchPrice ?? null,
    averagePrice: data.averagePrice ?? null,
    changedValue: data.changedValue ?? null,
  };
}
