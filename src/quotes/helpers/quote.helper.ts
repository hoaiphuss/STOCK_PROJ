import { Quote } from '../schemas/quote.schema';
import { fieldMap } from './quote.map';

export function mapQuoteToInternalFormat(quote: Quote): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [internalKey, dbField] of Object.entries(fieldMap)) {
    result[internalKey] = quote[dbField];
  }

  return result;
}
