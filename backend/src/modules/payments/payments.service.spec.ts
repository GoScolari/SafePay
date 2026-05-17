import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { of } from 'rxjs';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { Payment } from '../../database/entities/payment.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FeePayer, PaymentStatus, TxRole, TxStatus } from '../../common/enums';

const makeTx = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id:           'tx-1',
    initiatorId:  'user-seller',
    counterpartId: 'user-buyer',
    initiatorRole: TxRole.SELLER,
    status:       TxStatus.CONFIRMADA,
    amount:       150_000,
    fee:          1_490,
    feePayer:     FeePayer.SPLIT,
    slug:         'tx-abcd1234',
    description:  'iPhone en excelente estado',
    initiator:    { mpAccessToken: null } as any,
    counterpart:  { mpAccessToken: null } as any,
    ...overrides,
  }) as Transaction;

const makePayment = (overrides: Partial<Payment> = {}): Payment =>
  ({
    id:            'pay-1',
    transactionId: 'tx-1',
    mpPaymentId:   null,
    status:        PaymentStatus.PENDING,
    amountTotal:   150_745,
    amountFeeMp:   null,
    amountFeePlatform: 1_490,
    amountSeller:  null,
    transaction:   makeTx(),
    ...overrides,
  }) as Payment;

const mockRepo = () => ({
  findOne: jest.fn(),
  create:  jest.fn(),
  save:    jest.fn(),
  update:  jest.fn(),
});

const mockHttp = () => ({ post: jest.fn(), get: jest.fn() });

const mockConfig = () => ({
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'mercadoPago.appId':       '',   // sin credenciales → modo dev
      'mercadoPago.webhookSecret': '',
      'apiUrl':                  'http://localhost:3000',
    };
    return map[key] ?? '';
  }),
});

const mockUsersService = () => ({
  decryptMpToken: jest.fn().mockReturnValue('decrypted-token'),
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: ReturnType<typeof mockRepo>;
  let txRepo:      ReturnType<typeof mockRepo>;
  let http:        ReturnType<typeof mockHttp>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment),     useFactory: mockRepo         },
        { provide: getRepositoryToken(Transaction), useFactory: mockRepo         },
        { provide: HttpService,                     useFactory: mockHttp         },
        { provide: ConfigService,                   useFactory: mockConfig       },
        { provide: UsersService,                    useFactory: mockUsersService },
        { provide: NotificationsService,            useValue: { notify: jest.fn() } },
      ],
    }).compile();

    service     = module.get(PaymentsService);
    paymentRepo = module.get(getRepositoryToken(Payment));
    txRepo      = module.get(getRepositoryToken(Transaction));
    http        = module.get(HttpService);
  });

  // ── calculateUnitPrice ────────────────────────────────────────────────────

  describe('initiate → unit_price calculado según feePayer', () => {
    const BASE = { amount: 150_000, fee: 1_490 };

    it.each([
      [FeePayer.BUYER,  150_000 + 1_490],   // 151490
      [FeePayer.SELLER, 150_000],            // 150000
      [FeePayer.SPLIT,  150_000 + 745],      // 150745 (ceil(1490/2))
    ])('feePayer=%s → amountTotal=%i', async (feePayer, expectedTotal) => {
      const tx = makeTx({ ...BASE, feePayer, status: TxStatus.CONFIRMADA });
      txRepo.findOne.mockResolvedValue(tx);
      paymentRepo.findOne.mockResolvedValue(null);
      const pay = makePayment({ amountTotal: expectedTotal });
      paymentRepo.create.mockReturnValue(pay);
      paymentRepo.save.mockResolvedValue(pay);

      await service.initiate({ transactionId: 'tx-1' }, 'user-seller');

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amountTotal: expectedTotal }),
      );
    });
  });

  // ── initiate ──────────────────────────────────────────────────────────────

  describe('initiate', () => {
    it('retorna paymentId existente sin crear uno nuevo (idempotencia)', async () => {
      txRepo.findOne.mockResolvedValue(makeTx());
      const existing = makePayment();
      paymentRepo.findOne.mockResolvedValue(existing);

      const result = await service.initiate({ transactionId: 'tx-1' }, 'user-seller');

      expect(result.paymentId).toBe('pay-1');
      expect(paymentRepo.create).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la tx no existe', async () => {
      txRepo.findOne.mockResolvedValue(null);

      await expect(service.initiate({ transactionId: 'no-existe' }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si la tx no está CONFIRMADA', async () => {
      txRepo.findOne.mockResolvedValue(makeTx({ status: TxStatus.PROPUESTA }));

      await expect(service.initiate({ transactionId: 'tx-1' }, 'user-seller')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza ForbiddenException si el usuario no pertenece a la tx', async () => {
      txRepo.findOne.mockResolvedValue(makeTx());
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.initiate({ transactionId: 'tx-1' }, 'ajeno')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('crea pago en modo dev (sin credenciales MP) y devuelve checkoutUrl null', async () => {
      txRepo.findOne.mockResolvedValue(makeTx());
      paymentRepo.findOne.mockResolvedValue(null);
      const pay = makePayment();
      paymentRepo.create.mockReturnValue(pay);
      paymentRepo.save.mockResolvedValue(pay);

      const result = await service.initiate({ transactionId: 'tx-1' }, 'user-seller');

      expect(result.checkoutUrl).toBeNull();
      expect(result.paymentId).toBe('pay-1');
    });
  });

  // ── release ───────────────────────────────────────────────────────────────

  describe('release', () => {
    it('lanza NotFoundException si el pago no existe', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.release('pay-1', 'user-buyer')).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el pago no está HELD', async () => {
      paymentRepo.findOne.mockResolvedValue(makePayment({ status: PaymentStatus.PENDING }));

      await expect(service.release('pay-1', 'user-buyer')).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException si quien libera no es el comprador', async () => {
      paymentRepo.findOne.mockResolvedValue(
        makePayment({ status: PaymentStatus.HELD }),
      );

      await expect(service.release('pay-1', 'user-seller')).rejects.toThrow(ForbiddenException);
    });

    it('marca RELEASED y tx COMPLETADO en modo dev', async () => {
      const pay = makePayment({ status: PaymentStatus.HELD });
      paymentRepo.findOne.mockResolvedValue(pay);
      paymentRepo.save.mockImplementation((p) => Promise.resolve({ ...p }));
      txRepo.save.mockImplementation((t) => Promise.resolve({ ...t }));

      const result = await service.release('pay-1', 'user-buyer');

      expect(result.released).toBe(true);
      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.RELEASED }),
      );
    });
  });

  // ── refund ────────────────────────────────────────────────────────────────

  describe('refund', () => {
    it('lanza BadRequestException si el pago no está HELD', async () => {
      paymentRepo.findOne.mockResolvedValue(makePayment({ status: PaymentStatus.RELEASED }));

      await expect(service.refund('pay-1')).rejects.toThrow(BadRequestException);
    });

    it('marca REFUNDED y tx REEMBOLSADO en modo dev', async () => {
      const pay = makePayment({ status: PaymentStatus.HELD });
      paymentRepo.findOne.mockResolvedValue(pay);
      paymentRepo.save.mockImplementation((p) => Promise.resolve({ ...p }));
      txRepo.save.mockImplementation((t) => Promise.resolve({ ...t }));

      const result = await service.refund('pay-1');

      expect(result.refunded).toBe(true);
      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.REFUNDED }),
      );
    });
  });

  // ── handleWebhook ─────────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    it('lanza BadRequestException si rawBody es undefined', async () => {
      await expect(service.handleWebhook(undefined, 'sig')).rejects.toThrow(BadRequestException);
    });

    it('retorna { received: true } y procesa el webhook cuando no hay secret (modo dev)', async () => {
      const body = JSON.stringify({ type: 'payment', data: { id: 'mp-pay-1' } });
      const rawBody = Buffer.from(body);

      // processPaymentEvent no hace nada sin credenciales MP → pasa silenciosamente
      const result = await service.handleWebhook(rawBody, '');

      expect(result.received).toBe(true);
    });

    it('lanza UnauthorizedException si la firma HMAC no coincide', async () => {
      // Crear servicio con secret configurado
      const configWithSecret = {
        get: jest.fn((key: string) => {
          if (key === 'mercadoPago.webhookSecret') return 'super-secret';
          if (key === 'mercadoPago.appId') return '';
          return 'http://localhost:3000';
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          PaymentsService,
          { provide: getRepositoryToken(Payment),     useFactory: mockRepo         },
          { provide: getRepositoryToken(Transaction), useFactory: mockRepo         },
          { provide: HttpService,                     useFactory: mockHttp         },
          { provide: ConfigService,                   useValue: configWithSecret   },
          { provide: UsersService,                    useFactory: mockUsersService },
          { provide: NotificationsService,            useValue: { notify: jest.fn() } },
        ],
      }).compile();

      const svcWithSecret = module.get(PaymentsService);
      const body = Buffer.from('{"type":"payment"}');

      await expect(svcWithSecret.handleWebhook(body, 'firma-incorrecta')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('acepta webhook con firma HMAC válida', async () => {
      const secret = 'super-secret';
      const configWithSecret = {
        get: jest.fn((key: string) => {
          if (key === 'mercadoPago.webhookSecret') return secret;
          if (key === 'mercadoPago.appId') return '';
          return 'http://localhost:3000';
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          PaymentsService,
          { provide: getRepositoryToken(Payment),     useFactory: mockRepo         },
          { provide: getRepositoryToken(Transaction), useFactory: mockRepo         },
          { provide: HttpService,                     useFactory: mockHttp         },
          { provide: ConfigService,                   useValue: configWithSecret   },
          { provide: UsersService,                    useFactory: mockUsersService },
          { provide: NotificationsService,            useValue: { notify: jest.fn() } },
        ],
      }).compile();

      const svcWithSecret = module.get(PaymentsService);
      const body = Buffer.from(JSON.stringify({ type: 'other' }));
      const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

      const result = await svcWithSecret.handleWebhook(body, validSig);

      expect(result.received).toBe(true);
    });
  });
});
