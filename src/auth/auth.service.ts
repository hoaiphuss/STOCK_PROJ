import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { isTokenValid } from './helpers/is-token-valid.helper';
import { Auth } from './schemas/auth.schema';
import extractTokenExpiry from './helpers/extract-token-expiry.helper';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private tokenPromise: Promise<{ token: string; investorId: string }> | null =
    null;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
  ) {}

  async getValidToken(): Promise<{ token: string; investorId: string }> {
    // Kiểm tra token trong DB trước
    const auth = await this.authModel.findOne();

    if (auth && isTokenValid(auth.token, auth.tokenExpiresAt)) {
      return { token: auth.token, investorId: auth.investorId };
    }

    // Nếu có promise đang chạy, chờ nó hoàn thành
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Tạo promise mới cho việc lấy token
    this.tokenPromise = this.authenticateAndSaveToken();

    try {
      const result = await this.tokenPromise;
      return result;
    } finally {
      // Reset promise sau khi hoàn thành (thành công hoặc lỗi)
      this.tokenPromise = null;
    }
  }

  private async authenticateAndSaveToken(): Promise<{
    token: string;
    investorId: string;
  }> {
    try {
      const { token, investorId } = await this.authenticate();
      await this.saveTokenToDB(token, investorId);
      return { token, investorId };
    } catch (error) {
      this.logger.error(
        'Authentication failed in authenticateAndSaveToken',
        error,
      );
      throw error;
    }
  }

  private async authenticate(): Promise<{ token: string; investorId: string }> {
    const authUrl = this.configService.get<string>('AUTH_URL');
    const meUrl = this.configService.get<string>('ME_URL');
    const username = this.configService.get<string>('USER');
    const password = this.configService.get<string>('PASSWORD');

    if (!authUrl || !meUrl || !username || !password) {
      throw new NotFoundException(
        'Missing Authentication Information in config',
      );
    }

    try {
      // Gọi API để lấy token
      const authRes = await axios.post(authUrl, { username, password });
      const token = authRes?.data?.token;
      if (!token) {
        throw new NotFoundException('Token not returned from auth API');
      }

      // Gọi API để lấy Investor ID
      const meRes = await axios.get(meUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const investorId = meRes.data?.investorId;
      if (!investorId) {
        throw new NotFoundException('Investor ID not found');
      }

      return { token, investorId };
    } catch (error) {
      this.logger.error('Authentication failed', error);
      throw new NotFoundException('Authentication failed');
    }
  }

  private async saveTokenToDB(
    token: string,
    investorId: string,
  ): Promise<void> {
    await this.authModel.findOneAndUpdate(
      {},
      {
        token,
        investorId,
        tokenExpiresAt: extractTokenExpiry(token),
      },
      { upsert: true, new: true },
    );
  }
}
