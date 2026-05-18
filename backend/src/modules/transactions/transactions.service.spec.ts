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
  findOne:          jest.fn(),
  find:             jest.fn(),
  create:           jest.fn(),
  save:             jest.fn(),
  update:           jest.fn(),
  createQueryBuilder: jest.fn(),
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

  // ── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('retorna transacciones activas del usuario como iniciador y contraparte', async () => {
      const txs = [makeTx({ initiatorId: 'user-1' }), makeTx({ counterpartId: 'user-1' })];
      txRepo.find.mockResolvedValue(txs);

      const result = await service.findByUser('user-1');

      expect(result).toHaveLength(2);
      expect(txRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.arrayContaining([
          expect.objectContaining({ initiatorId: 'user-1' }),
        ]),
      }));
    });

    it('retorna array vacío si no hay transacciones activas', async () => {
      txRepo.find.mockResolvedValue([]);

      const result = await service.findByUser('user-1');

      expect(result).toEqual([]);
    });
  });

  // ── findArchivedByUser ────────────────────────────────────────────────────

  describe('findArchivedByUser', () => {
    it('retorna transacciones archivadas del usuario', async () => {
      const qb = {
        where:    jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy:  jest.fn().mockReturnThis(),
        getMany:  jest.fn().mockResolvedValue([makeTx({ archivedAt: new Date() })]),
      };
      txRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findArchivedByUser('user-1');

      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith(expect.stringContaining('archived_at IS NOT NULL'));
    });

    it('retorna array vacío si no hay archivadas', async () => {
      const qb = {
        where:    jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy:  jest.fn().mockReturnThis(),
        getMany:  jest.fn().mockResolvedValue([]),
      };
      txRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findArchivedByUser('user-1');

      expect(result).toEqual([]);
    });
  });

  // ── archive ───────────────────────────────────────────────────────────────

  describe('archive', () => {
    it('archiva una transacción en estado COMPLETADO', async () => {
      const tx = makeTx({ status: TxStatus.COMPLETADO, initiatorId: 'user-1' });
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockImplementation((t) => Promise.resolve({ ...t }));

      const result = await service.archive('tx-1', 'user-1');

      expect(result.archivedAt).toBeDefined();
    });

    it.each([TxStatus.CANCELADO, TxStatus.EXPIRADO, TxStatus.REEMBOLSADO])(
      'archiva una transacción en estado %s',
      async (status) => {
        txRepo.findOne.mockResolvedValue(makeTx({ status, initiatorId: 'user-1' }));
        txRepo.save.mockImplementation((t) => Promise.resolve({ ...t }));

        const result = await service.archive('tx-1', 'user-1');

        expect(result.archivedAt).toBeDefined();
      },
    );

    it('lanza ForbiddenException si el usuario no pertenece a la tx', async () => {
      txRepo.findOne.mockResolvedValue(makeTx({ status: TxStatus.COMPLETADO, initiatorId: 'user-seller', counterpartId: 'user-buyer' }));

      await expect(service.archive('tx-1', 'ajeno')).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si la tx está en estado no archivable', async () => {
      txRepo.findOne.mockResolvedValue(makeTx({ status: TxStatus.PAGADO, initiatorId: 'user-1' }));

      await expect(service.archive('tx-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── deliver ───────────────────────────────────────────────────────────────

  describe('deliver', () => {
    it('transición PAGADO → ENTREGADO en tx presencial (vendedor=iniciador)', async () => {
      const tx = makeTx({
        status:        TxStatus.PAGADO,
        modality:      TxModality.PRESENTIAL,
        initiatorId:   'user-seller',
        initiatorRole: TxRole.SELLER,
      });
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockImplementation((t) => Promise.resolve({ ...t }));

      const result = await service.deliver('tx-1', 'user-seller');

      expect(result.status).toBe(TxStatus.ENTREGADO);
      expect(result.autoReleaseAt).toBeDefined();
    });

    it('transición PAGADO → ENTREGADO en tx presencial (vendedor=contraparte)', async () => {
      const tx = makeTx({
        status:        TxStatus.PAGADO,
        modality:      TxModality.PRESENTIAL,
        initiatorId:   'user-buyer',
        counterpartId: 'user-seller',
        initiatorRole: TxRole.BUYER,
      });
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockImplementation((t) => Promise.resolve({ ...t }));

      const result = await service.deliver('tx-1', 'user-seller');

      expect(result.status).toBe(TxStatus.ENTREGADO);
    });

    it('lanza BadRequestException si la modalidad no es presencial', async () => {
      txRepo.findOne.mockResolvedValue(makeTx({ status: TxStatus.PAGADO, modality: TxModality.SHIPPING }));

      await expect(service.deliver('tx-1', 'user-seller')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el status no es PAGADO', async () => {
      txRepo.findOne.mockResolvedValue(makeTx({ status: TxStatus.CONFIRMADA, modality: TxModality.PRESENTIAL }));

      await expect(service.deliver('tx-1', 'user-seller')).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException si quien confirma no es el vendedor', async () => {
      const tx = makeTx({
        status:        TxStatus.PAGADO,
        modality:      TxModality.PRESENTIAL,
        initiatorId:   'user-seller',
        initiatorRole: TxRole.SELLER,
      });
      txRepo.findOne.mockResolvedValue(tx);

      await expect(service.deliver('tx-1', 'user-buyer')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── expireProposals (cron) ────────────────────────────────────────────────

  describe('expireProposals (cron)', () => {
    it('actualiza a EXPIRADO las propuestas vencidas', async () => {
      txRepo.update.mockResolvedValue({ affected: 2 });

      await service.expireProposals();

      expect(txRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: TxStatus.PROPUESTA }),
        { status: TxStatus.EXPIRADO },
      );
    });
  });

  // ── autoRelease (cron) ────────────────────────────────────────────────────

  describe('autoRelease (cron)', () => {
    it('actualiza a COMPLETADO las transacciones entregadas con autoReleaseAt vencido', async () => {
      txRepo.update.mockResolvedValue({ affected: 1 });

      await service.autoRelease();

      expect(txRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: TxStatus.ENTREGADO }),
        { status: TxStatus.COMPLETADO },
      );
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
