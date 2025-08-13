import { Quote } from '../schemas/quote.schema';

export const fieldMap: Record<string, keyof Quote> = {
  StockCode: 'symbol',
  TradingDate: 'tradingTime',
  KLCPLH: 'listedShares',
  PriorClosePrice: 'referencePrice',
  CeilingPrice: 'highLimitPrice',
  FloorPrice: 'lowLimitPrice',
  TotalVol: 'totalVolumeTraded',
  TotalVal: 'matchValue',
  HighestPrice: 'highestPrice',
  LowestPrice: 'lowestPrice',
  OpenPrice: 'openPrice',
  LastPrice: 'matchPrice',
  AvrPrice: 'averagePrice',
  Change: 'changedValue',
  ClosePrice: 'matchPrice',
  BasicPrice: 'referencePrice',
};
