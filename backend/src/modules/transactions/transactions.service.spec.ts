import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../../database/entities/transaction.entity';
import { FeePayer, TxModality, TxRole, TxStatus } from '../../common/enums';

const makeTx = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id:           'tx-1',
    initiatorId:  'user-seller',
    counterpartId: null,
    initiatorRole: TxRole.SELLER,
    modality:     TxModality.SHIPPING,
    status:       TxStatus.PROPUESTA,
    amount:       150_000,
    fee:          1_490,
    feePayer:     FeePayer.SPLIT,
    slug:         'tx-abcd1234',
    description:  'iPhone 13 Pro en excelente estado',
    expiresAt:    new Date(Date.now() + 86_400_000),
    createdAt:    new Date(),
    initiator:    { fullName: 'Vendedor Test' } as any,
    ...overrides,
  }) as Transaction;

const mockRepo = () => ({
  findOne: jest.fn(),
  find:    jest.fn(),
  create:  jest.fn(),
  save:    jest.fn(),
  update:  jest.fn(),
});

describe('TransactionsService', () => {
  let service: TransactionsService;
  let txRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(TransactionsService);
    txRepo  = module.get(getRepositoryToken(Transaction));
  });

  // ── calculateFee (lógica de tramos) ───────────────────────────────────────

  describe('calculateFee (vía create)', () => {
    const dto = {
      initiatorRole: TxRole.SELLER,
      modality:      TxModality.SHIPPING,
      feePayer:      FeePayer.SPLIT,
      description:   'Artículo de prueba para testear el fee',
    };

    it.each([
      [50_000,   990],
      [100_000,  990],
      [100_001, 1_490],
      [500_000, 1_490],
      [500_001, 1_990],
      [999_999, 1_990],
    ])('amount=%i → fee=%i', async (amount, expectedFee) => {
      const tx = makeTx({ amount, fee: expectedFee });
      txRepo.findOne.mockResolvedValue(null);
      txRepo.create.mockReturnValue(tx);
      txRepo.save.mockResolvedValue(tx);

      const result = await service.create({ ...dto, amount }, 'user-1');

      expect(txRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ fee: expectedFee }),
      );
      expect(result.fee).toBe(expectedFee);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('genera slug único y retorna la transacción creada', async () => {
      const tx = makeTx();
      txRepo.findOne.mockResolvedValue(null); // slug no existe
      txRepo.create.mockReturnValue(tx);
      txRepo.save.mockResolvedValue(tx);

      const result = await service.create(
        {
          initiatorRole: TxRole.SELLER,
          modality:      TxModality.SHIPPING,
          amount:        150_000,
          feePayer:      FeePayer.SPLIT,
          description:   'Descripción de prueba válida para test',
        },
        'user-seller',
      );

      expect(result.id).toBe('tx-1');
      expect(txRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('retorna la transacción si existe', async () => {
      txRepo.findOne.mockResolvedValue(makeTx());

      const result = await service.findById('tx-1');

      expect(result.id).toBe('tx-1');
    });

    it('lanza NotFoundException si no existe', async () => {
      txRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('no-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findBySlug ────────────────────────────────────────────────────────────

  describe('findBySlug', () => {
    it('retorna proyección pública con initiatorName', async () => {
      txRepo.findOne.mockResolvedValue(makeTx());

      const result = await service.findBySlug('tx-abcd1234');

      expect(result).toMatchObject({ slug: 'tx-abcd1234', initiatorName: 'Vendedor Test' });
      expect(result).not.toHaveProperty('initiatorId');
    });

    it('lanza NotFoundException si el slug no existe', async () => {
      txRepo.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('slug-falso')).rejects.toThrow(NotFoundException);
    });
  });

  // ── accept ────────────────────────────────────────────────────────────────

  describe('accept', () => {
    it('transición PROPUESTA → CONFIRMADA con contraparte correcta', async () => {
      const tx = makeTx({ status: TxStatus.PROPUESTA });
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockImplementation((t) => Promise.resolve({ ...t }));

      const result = await service.accept('tx-1', 'user-buyer');

      expect(result.status).toBe(TxStatus.CONFIRMADA);
      expect(result.counterpartId).toBe('user-buyer');
    });

    it('lanza BadRequestException si la tx no está en PROPUESTA', async () => {
      txRepo.findOne.mockResolvedValue(makeTx({ status: TxStatus.CONFIRMADA }));

      await expect(service.accept('tx-1', 'user-buyer')).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException si el iniciador intenta aceptar su propia tx', async () => {
      txRepo.findOne.mockResolvedValue(makeTx({ initiatorId: 'user-seller' }));

      await expect(service.accept('tx-1', 'user-seller')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('transición PAGADO → CANCELADO para el iniciador', async () => {
      const tx = makeTx({ status: TxStatus.PAGADO, initiatorId: 'user-seller', counterpartId: 'user-buyer' });
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockImplementation((t) => Promise.resolve({ ...t }));

      const result = await service.cancel('tx-1', 'user-seller');

      expect(result.status).toBe(TxStatus.CANCELADO);
    });

    it('lanza BadRequestException si la tx no está en PAGADO', async () => {
      txRepo.findOne.mockResolvedValue(makeTx({ status: TxStatus.CONFIRMADA }));

      await expect(service.cancel('tx-1', 'user-seller')).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException si el usuario no pertenece a la tx', async () => {
      txRepo.findOne.mockResolvedValue(
        makeTx({ status: TxStatus.PAGADO, initiatorId: 'user-seller', counterpartId: 'user-buyer' }),
      );

      await expect(service.cancel('tx-1', 'ajeno')).rejects.toThrow(ForbiddenException);
    });
  });
});
