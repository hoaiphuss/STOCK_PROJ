// src/quotes/helpers/quote.helper.ts
import { Quote } from '../schemas/quote.schema';
import { fieldMap, marketMap } from './quote.map';

export function mapQuoteToInternalFormat(
  quote: Quote,
  row?: number,
  rows?: number,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [internalKey, dbField] of Object.entries(fieldMap)) {
    if (dbField) {
      const key = dbField as keyof Quote; // ✅ ép kiểu an toàn
      if (internalKey === 'TradingDate' && quote[key]) {
        // convert UTC -> VN timezone (+7)
        const vnDate = new Date(quote[key] as any);
        vnDate.setHours(vnDate.getHours() + 7);
        result[internalKey] = vnDate.toISOString();
      } else {
        result[internalKey] = quote[key];
      }
    } else {
      result[internalKey] = null;
    }
  }

  if (row !== undefined) result['Row'] = row;
  if (rows !== undefined) result['Rows'] = rows;

  // thêm Exchange từ marketId
  result['Exchange'] = marketMap[quote.marketId ?? ''] ?? null;

  return result;
}
