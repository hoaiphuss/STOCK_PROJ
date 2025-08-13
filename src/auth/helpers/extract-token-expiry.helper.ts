/**
 * Main Purpose:
 * - Get the exp (expiration time) field from the JWT Token
 * - Convert it to a timestamp (millisecond), and return it
 */

// Logger: to log error
// NotFoundException: to throw HTTP 404 error if token is invalid
import { Logger, NotFoundException } from '@nestjs/common';

// Create logger with 'AuthHelper' to easily trace when there is an error in the system log.
const logger = new Logger('AuthHelper');

export default function extractTokenExpiry(token: string): number {
  try {
    /**
     * JWT has 3 parts separated by '.'
     * - header
     * - payload: content exp
     * - signature
     * 
     * split('.') return a 3-part array, just need to get the payload part -> located at index [1]
     */
    const [, payloadBase64] = token.split('.');

    /**
     * Decode Base64 string -> JSON String -> parse into JS Object
     */
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

    if (!payload.exp) throw new Error('Token has no expiration claim');

    return payload.exp * 1000;
  } catch (err) {
    logger.error('Invalid token structure', err);
    throw new NotFoundException('Failed to decode token expiration');
  }
}