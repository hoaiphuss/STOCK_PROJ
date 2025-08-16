// src/quotes/helpers/quote.map.ts
import { Quote } from '../schemas/quote.schema';

export const fieldMap: Record<string, keyof Quote | null> = {
  StockCode: 'symbol',
  TradingDate: 'tradingTime',
  KLCPLH: 'listedShares',
  KLCPNY: null,
  PriorClosePrice: 'referencePrice',
  CeilingPrice: 'highLimitPrice',
  FloorPrice: 'lowLimitPrice',
  TotalVol: 'totalVolumeTraded',
  TotalVal: 'grossTradeAmount',
  MarketCapital: null,
  HighestPrice: 'highestPrice',
  LowestPrice: 'lowestPrice',
  OpenPrice: 'openPrice',
  LastPrice: 'matchPrice',
  AvrPrice: 'averagePrice',
  Change: 'changedValue',
  ChangeRatio: 'changedRatio',
  ClosePrice: 'matchPrice',
  TotalPutVol: null,
  TotalPutVal: null,
  Row: null,
  Rows: null,
  BasicPrice: 'referencePrice',
};

export const marketMap: Record<string, string> = {
  MARKET_ID_STO: 'HOSE',
  MARKET_ID_STX: 'HNX',
  MARKET_ID_UPX: 'UPCoM',
};

export const exchangeToMarketId: Record<string, string> = {
  HOSE: 'MARKET_ID_STO',
  HNX: 'MARKET_ID_STX',
  UPCoM: 'MARKET_ID_UPX',
};
