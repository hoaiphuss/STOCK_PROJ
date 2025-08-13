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

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
  ) {}

  async getValidToken(): Promise<{ token: string; investorId: string }> {
    const auth = await this.authModel.findOne();

    if (auth && isTokenValid(auth.token, auth.tokenExpiresAt)) {
      return { token: auth.token, investorId: auth.investorId };
    }

    const { token, investorId } = await this.authenticate();
    await this.saveTokenToDB(token, investorId);

    return { token, investorId };
  }

  private async authenticate(): Promise<{ token: string; investorId: string }> {
    const authUrl = this.configService.get<string>('AUTH_URL');
    const meUrl = this.configService.get<string>('ME_URL');
    const username = this.configService.get<string>('USER');
    const password = this.configService.get<string>('PASSWORD');

    if (!authUrl || !meUrl) {
      throw new NotFoundException('Missing AUTH_URL or ME_URL in config');
    }

    try {
      const authRes = await axios.post(authUrl, { username, password });
      const token = authRes?.data?.token;

      if (!token)
        throw new NotFoundException('Token not returned from auth API');

      const meRes = await axios.get(meUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const investorId = meRes.data?.investorId;
      if (!investorId) throw new NotFoundException('Investor ID not found');

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
