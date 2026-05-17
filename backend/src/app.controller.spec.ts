import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { getDataSourceToken } from '@nestjs/typeorm';
import { TransactionsService } from './modules/transactions/transactions.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: getDataSourceToken(),
          useValue: { isInitialized: true },
        },
        {
          provide: TransactionsService,
          useValue: {},
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return status ok', async () => {
      const result = await appController.health();
      expect(result.status).toBe('ok');
    });
  });
});
