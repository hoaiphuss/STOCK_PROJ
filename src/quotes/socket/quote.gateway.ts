import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { Quote } from '../schemas/quote.schema';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class QuoteGateway {
  private readonly logger = new Logger(QuoteGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('✅ WebSocket Gateway initialized');
  }

  handleConnection(client: any) {
    this.logger.log(`📡 Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`❌ Client disconnected: ${client.id}`);
  }

  sendQuoteUpdate(quote: Partial<Quote>) {
    this.server.emit('quote-update', quote);
  }
}
