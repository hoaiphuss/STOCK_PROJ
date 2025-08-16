import { Logger, NotFoundException } from '@nestjs/common';

const logger = new Logger('AuthHelper');
export default function extractTokenExpiry(token: string): number {
  try {
    const [, payloadBase64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

    if (!payload.exp) throw new Error('Token has no expiration claim');

    return payload.exp * 1000;
  } catch (err) {
    logger.error('Invalid token structure', err);
    throw new NotFoundException('Failed to decode token expiration');
  }
}
