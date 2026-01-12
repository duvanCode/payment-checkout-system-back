import { TransactionSyncService } from './transaction-sync.service';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';
import { PaymentGatewayPort } from '../../application/ports/payment-gateway.port';
import { DeliveryRepositoryPort } from '../../application/ports/delivery.repository.port';
import { UpdateStockUseCase } from '../../application/use-cases/update-stock.use-case';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Result } from '../../shared/result';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';

describe('TransactionSyncService', () => {
    let service: TransactionSyncService;
    let mockTransactionRepository: jest.Mocked<TransactionRepositoryPort>;
    let mockPaymentGateway: jest.Mocked<PaymentGatewayPort>;
    let mockDeliveryRepository: jest.Mocked<DeliveryRepositoryPort>;
    let mockUpdateStockUseCase: jest.Mocked<UpdateStockUseCase>;
    let mockConfigService: jest.Mocked<ConfigService>;
    let mockSchedulerRegistry: jest.Mocked<SchedulerRegistry>;

    beforeEach(() => {
        jest.useFakeTimers();
        mockTransactionRepository = {
            findPendingTransactions: jest.fn(),
            update: jest.fn(),
        } as any;
        mockPaymentGateway = {
            getTransaction: jest.fn(),
        } as any;
        mockDeliveryRepository = {
            findByTransactionId: jest.fn(),
            save: jest.fn(),
        } as any;
        mockUpdateStockUseCase = {
            execute: jest.fn(),
        } as any;
        mockConfigService = {
            get: jest.fn().mockReturnValue('300'),
        } as any;
        mockSchedulerRegistry = {
            addInterval: jest.fn(),
        } as any;

        service = new TransactionSyncService(
            mockTransactionRepository,
            mockPaymentGateway,
            mockDeliveryRepository,
            mockUpdateStockUseCase,
            mockConfigService,
            mockSchedulerRegistry,
        );
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('syncPendingTransactions', () => {
        it('should skip execution if already processing', async () => {
            (service as any).isProcessing = true;
            const loggerSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => { });

            await service.syncPendingTransactions();

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('already running'));
            expect(mockTransactionRepository.findPendingTransactions).not.toHaveBeenCalled();
        });


        it('should log message when no pending transactions found', async () => {
            mockTransactionRepository.findPendingTransactions.mockResolvedValue(Result.ok([]));
            const loggerSpy = jest.spyOn((service as any).logger, 'log');

            await service.syncPendingTransactions();

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('No pending transactions'));
        });

        it('should process multiple pending transactions', async () => {
            const mockTransactions = [
                { getTransactionNumber: () => 'T1', toJSON: () => ({ serviceTransactionId: 'S1' }) },
                { getTransactionNumber: () => 'T2', toJSON: () => ({ serviceTransactionId: 'S2' }) },
            ];

            mockTransactionRepository.findPendingTransactions.mockResolvedValue(Result.ok(mockTransactions));

            // Re-mocking syncTransaction to avoid deep testing here (testing the loop)
            const syncSpy = jest.spyOn(service as any, 'syncTransaction').mockResolvedValue(undefined);

            await service.syncPendingTransactions();

            expect(syncSpy).toHaveBeenCalledTimes(2);
            expect((service as any).isProcessing).toBe(false);
        });

        it('should handle errors in fetch gracefully', async () => {
            mockTransactionRepository.findPendingTransactions.mockResolvedValue(Result.fail('Error'));
            const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => { });

            await service.syncPendingTransactions();

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch'));
        });

    });

    describe('syncTransaction', () => {
        const mockTransaction = {
            getTransactionNumber: () => 'T1',
            toJSON: () => ({ serviceTransactionId: 'S1' }),
            updateFromService: jest.fn(),
            isApproved: () => true,
            getId: () => 'tx-123',
            getStatus: () => 'APPROVED',
        } as any;

        it('should skip if no serviceTransactionId', async () => {
            const txNoId = { toJSON: () => ({}), getTransactionNumber: () => 'T-NO-ID' };
            const loggerSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => { });

            await (service as any).syncTransaction(txNoId);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('no service transaction ID'));
            expect(mockPaymentGateway.getTransaction).not.toHaveBeenCalled();
        });


        it('should update transaction status from gateway', async () => {
            const gatewayResponse = { transactionId: 'S1', status: 'APPROVED' };
            mockPaymentGateway.getTransaction.mockResolvedValue(Result.ok(gatewayResponse));
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const processApprovedSpy = jest.spyOn(service as any, 'processApprovedTransaction').mockResolvedValue(undefined);

            await (service as any).syncTransaction(mockTransaction);

            expect(mockTransaction.updateFromService).toHaveBeenCalledWith('S1', 'APPROVED');
            expect(mockTransactionRepository.update).toHaveBeenCalledWith(mockTransaction);
            expect(processApprovedSpy).toHaveBeenCalled();
        });

        it('should log error if gateway fetch fails', async () => {
            mockPaymentGateway.getTransaction.mockResolvedValue(Result.fail('Gateway Error'));
            const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => { });

            await (service as any).syncTransaction(mockTransaction);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to get transaction from Wompi'));
        });

    });

    describe('processApprovedTransaction', () => {
        const mockApprovedTx = {
            getTransactionNumber: () => 'T-APP',
            getId: () => 'tx-123',
            toJSON: () => ({ productId: 'P1', quantity: 5 }),
        } as any;

        it('should skip if delivery already exists', async () => {
            mockDeliveryRepository.findByTransactionId.mockResolvedValue(Result.ok({}));
            const loggerSpy = jest.spyOn((service as any).logger, 'log');

            await (service as any).processApprovedTransaction(mockApprovedTx);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Delivery already exists'));
            expect(mockUpdateStockUseCase.execute).not.toHaveBeenCalled();
        });

        it('should update stock and create delivery', async () => {
            mockDeliveryRepository.findByTransactionId.mockResolvedValue(Result.fail('Not found'));
            mockUpdateStockUseCase.execute.mockResolvedValue(Result.ok(undefined));
            mockDeliveryRepository.save.mockResolvedValue(Result.ok({ getTrackingNumber: () => 'TRK-123' }));

            await (service as any).processApprovedTransaction(mockApprovedTx);

            expect(mockUpdateStockUseCase.execute).toHaveBeenCalledWith('P1', 5);
            expect(mockDeliveryRepository.save).toHaveBeenCalled();
        });

        it('should handle stock update failure', async () => {
            mockDeliveryRepository.findByTransactionId.mockResolvedValue(Result.fail('Not found'));
            mockUpdateStockUseCase.execute.mockResolvedValue(Result.fail('No stock'));
            const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => { });

            await (service as any).processApprovedTransaction(mockApprovedTx);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to update stock'));
            expect(mockDeliveryRepository.save).not.toHaveBeenCalled();
        });

    });

    describe('lifecycle', () => {
        it('should add interval on module init', () => {
            service.onModuleInit();
            expect(mockSchedulerRegistry.addInterval).toHaveBeenCalledWith(
                'transaction-sync',
                expect.any(Object),
            );
        });
    });
});
