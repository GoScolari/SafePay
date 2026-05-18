import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../../database/entities/user.entity';
import { UserRole } from '../../common/enums';

const mockUser = (): User =>
  ({
    id: 'user-1',
    phone: '+56912345678',
    fullName: 'Test User',
    phoneVerified: false,
    role: UserRole.USER,
    banned: false,
    refreshToken: null,
  }) as User;

const mockRepo = () => ({
  findOne: jest.fn(),
  create:  jest.fn(),
  save:    jest.fn(),
  update:  jest.fn(),
});

const mockJwt = () => ({
  sign: jest.fn().mockReturnValue('jwt-token'),
});

const mockConfig = () => ({
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'twilio.sid':         '',
      'twilio.token':       '',
      'twilio.serviceSid':  '',
      'nodeEnv':            'test',
      'jwt.refreshExpires': '30d',
      'jwt.refreshSecret':  'test-secret',
    };
    return map[key] ?? '';
  }),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockRepo },
        { provide: JwtService,    useFactory: mockJwt   },
        { provide: ConfigService, useFactory: mockConfig },
      ],
    }).compile();

    service  = module.get(AuthService);
    userRepo = module.get(getRepositoryToken(User));
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('crea usuario y devuelve mensaje cuando el teléfono no existe', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser());
      userRepo.save.mockResolvedValue(mockUser());

      const result = await service.register({ phone: '+56912345678', fullName: 'Test User' });

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+56912345678', fullName: 'Test User' }),
      );
      expect(result.message).toContain('OTP');
    });

    it('lanza ConflictException si el teléfono ya existe', async () => {
      userRepo.findOne.mockResolvedValue(mockUser());

      await expect(
        service.register({ phone: '+56912345678', fullName: 'Test User' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('devuelve mensaje cuando el usuario existe', async () => {
      userRepo.findOne.mockResolvedValue(mockUser());

      const result = await service.login({ phone: '+56912345678' });

      expect(result.message).toContain('OTP');
    });

    it('lanza UnauthorizedException si el teléfono no existe', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login({ phone: '+56999999999' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── verifyOtp ─────────────────────────────────────────────────────────────

  describe('verifyOtp', () => {
    it('devuelve accessToken y datos de usuario si el teléfono existe', async () => {
      const user = mockUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, phoneVerified: true });

      const res = { cookie: jest.fn() } as any;
      const result = await service.verifyOtp(
        { phone: '+56912345678', code: '123456' },
        res,
      );

      expect(result.accessToken).toBe('jwt-token');
      expect(result.user).toMatchObject({ id: 'user-1', phone: '+56912345678' });
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', expect.any(String), expect.any(Object));
    });

    it('lanza UnauthorizedException si el teléfono no existe', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const res = { cookie: jest.fn() } as any;

      await expect(
        service.verifyOtp({ phone: '+56999999999', code: '000000' }, res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si Twilio rechaza el OTP', async () => {
      const user = mockUser();
      userRepo.findOne.mockResolvedValue(user);

      // Inyectar twilioClient falso directamente sobre la instancia del servicio
      (service as any).twilioClient = {
        verify: {
          v2: {
            services: () => ({
              verificationChecks: {
                create: jest.fn().mockResolvedValue({ status: 'pending' }),
              },
            }),
          },
        },
      };

      const res = { cookie: jest.fn() } as any;
      await expect(
        service.verifyOtp({ phone: '+56912345678', code: '999999' }, res),
      ).rejects.toThrow(UnauthorizedException);

      // Limpiar para no afectar otros tests
      (service as any).twilioClient = undefined;
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('borra cookie y anula refresh token', async () => {
      userRepo.update.mockResolvedValue({ affected: 1 });
      const res = { clearCookie: jest.fn() } as any;

      const result = await service.logout('user-1', res);

      expect(userRepo.update).toHaveBeenCalledWith('user-1', { refreshToken: null });
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(result.message).toContain('cerrada');
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('lanza UnauthorizedException si el usuario no tiene refreshToken', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser(), refreshToken: null });
      const res = { cookie: jest.fn() } as any;

      await expect(service.refresh('user-1', 'bad-token', res)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si el hash no coincide', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser(),
        refreshToken: 'hash-incorrecto',
      });
      const res = { cookie: jest.fn() } as any;

      await expect(service.refresh('user-1', 'token-diferente', res)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('emite nuevo accessToken cuando el refreshToken es válido', async () => {
      const rawToken = 'valid-refresh-token';
      const hash = require('crypto').createHash('sha256').update(rawToken).digest('hex');
      const user = { ...mockUser(), refreshToken: hash };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      const res = { cookie: jest.fn() } as any;
      const result = await service.refresh('user-1', rawToken, res);

      expect(result.accessToken).toBe('jwt-token');
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', expect.any(String), expect.any(Object));
    });
  });
});
