import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService', () => {
  let service: AuthService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        AUTH_URL: 'https://services.entrade.com.vn/dnse-user-service/api/auth',
        ME_URL: 'https://services.entrade.com.vn/dnse-user-service/api/me',
        USERNAME: '064C494087',
        PASSWORD: 'Iah123$%',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should authenticate and return token + investorId', async () => {
    const mockToken = generateMockJwtToken();
    const mockInvestorId = '1000662332';

    mockedAxios.post.mockResolvedValueOnce({
      data: { token: mockToken },
    });

    mockedAxios.get.mockResolvedValueOnce({
      data: { investorId: mockInvestorId },
    });

    const result = await service.getValidToken();

    expect(result.token).toBe(mockToken);
    expect(result.investorId).toBe(mockInvestorId);
    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalled();
  });
});

function generateMockJwtToken(): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  const signature = 'mock-signature';

  return `${header}.${payload}.${signature}`;
}
