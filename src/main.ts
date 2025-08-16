import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';   // ✅ thêm dòng này

// ✅ gắn crypto vào global nếu chưa có
if (!(global as any).crypto) {
  (global as any).crypto = crypto;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const configService = app.get(ConfigService);
  await app.listen(configService.get<number>('APP_PORT') ?? 8080);
}
bootstrap();
