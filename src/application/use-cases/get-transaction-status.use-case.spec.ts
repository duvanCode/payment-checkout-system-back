import { GetTransactionStatusUseCase } from './get-transaction-status.use-case';
import { TransactionRepositoryPort } from '../ports/transaction.repository.port';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { Money } from '../../domain/value-objects/money.vo';
import { Result } from '../../shared/result';

describe('GetTransactionStatusUseCase', () => {
    let useCase: GetTransactionStatusUseCase;
    let mockTransactionRepository: jest.Mocked<TransactionRepositoryPort>;
    let mockPaymentGateway: jest.Mocked<PaymentGatewayPort>;

    beforeEach(() => {
        mockTransactionRepository = {
            findById: jest.fn(),
            findByTransactionNumber: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            findPendingTransactions: jest.fn(),
        } as jest.Mocked<TransactionRepositoryPort>;

        mockPaymentGateway = {
            processPayment: jest.fn(),
            getTransaction: jest.fn(),
        } as jest.Mocked<PaymentGatewayPort>;

        useCase = new GetTransactionStatusUseCase(mockTransactionRepository, mockPaymentGateway);
    });

    describe('execute', () => {
        it('should return transaction status when transaction exists without service ID', async () => {
            const mockTransaction = new Transaction(
                'trans-123',
                'TRX-1234567890-ABC',
                TransactionStatus.PENDING,
                'prod-456',
                'cust-789',
                2,
                Money.from(100000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(107000, 'COP'),
                new Date('2024-01-01'),
                new Date('2024-01-01'),
            );

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(
                Result.ok(mockTransaction),
            );

            const result = await useCase.execute('TRX-1234567890-ABC');

            expect(result.isSuccess).toBe(true);
            const status = result.getValue();
            expect(status.transactionNumber).toBe('TRX-1234567890-ABC');
            expect(status.internalStatus).toBe(TransactionStatus.PENDING);
            expect(status.serviceStatus).toBeUndefined();
            expect(status.serviceTransactionId).toBeUndefined();
            expect(status.total).toBe(107000);
            expect(status.productId).toBe('prod-456');
            expect(status.quantity).toBe(2);
            expect(mockPaymentGateway.getTransaction).not.toHaveBeenCalled();
        });

        it('should query payment gateway when transaction has service ID', async () => {
            const mockTransaction = new Transaction(
                'trans-456',
                'TRX-9876543210-XYZ',
                TransactionStatus.APPROVED,
                'prod-111',
                'cust-222',
                1,
                Money.from(50000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(57000, 'COP'),
                new Date('2024-01-01'),
                new Date('2024-01-02'),
                'service-trans-999',
                'APPROVED',
            );

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(
                Result.ok(mockTransaction),
            );

            mockPaymentGateway.getTransaction.mockResolvedValue(
                Result.ok({
                    transactionId: 'service-trans-999',
                    status: 'APPROVED',
                    amount: 57000,
                }),
            );

            const result = await useCase.execute('TRX-9876543210-XYZ');

            expect(result.isSuccess).toBe(true);
            const status = result.getValue();
            expect(status.serviceTransactionId).toBe('service-trans-999');
            expect(status.serviceStatus).toBe('APPROVED');
            expect(mockPaymentGateway.getTransaction).toHaveBeenCalledWith('service-trans-999');
        });

        it('should use cached service status when gateway query fails', async () => {
            const mockTransaction = new Transaction(
                'trans-789',
                'TRX-5555555555-AAA',
                TransactionStatus.PENDING,
                'prod-333',
                'cust-444',
                1,
                Money.from(30000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(37000, 'COP'),
                new Date('2024-01-01'),
                new Date('2024-01-01'),
                'service-trans-555',
                'PENDING',
            );

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(
                Result.ok(mockTransaction),
            );

            mockPaymentGateway.getTransaction.mockResolvedValue(
                Result.fail('Gateway timeout'),
            );

            const result = await useCase.execute('TRX-5555555555-AAA');

            expect(result.isSuccess).toBe(true);
            const status = result.getValue();
            expect(status.serviceStatus).toBe('PENDING');
        });

        it('should fail when transaction is not found', async () => {
            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(
                Result.fail('Transaction not found'),
            );

            const result = await useCase.execute('TRX-NONEXISTENT-XXX');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Transaction not found');
            expect(mockPaymentGateway.getTransaction).not.toHaveBeenCalled();
        });

        it('should return transaction with APPROVED status', async () => {
            const mockTransaction = new Transaction(
                'trans-approved',
                'TRX-1111111111-BBB',
                TransactionStatus.APPROVED,
                'prod-666',
                'cust-777',
                3,
                Money.from(150000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(157000, 'COP'),
                new Date('2024-01-01'),
                new Date('2024-01-03'),
                'service-approved-123',
                'APPROVED',
                undefined,
                new Date('2024-01-03'),
            );

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(
                Result.ok(mockTransaction),
            );

            mockPaymentGateway.getTransaction.mockResolvedValue(
                Result.ok({
                    transactionId: 'service-approved-123',
                    status: 'APPROVED',
                    amount: 157000,
                }),
            );

            const result = await useCase.execute('TRX-1111111111-BBB');

            expect(result.isSuccess).toBe(true);
            const status = result.getValue();
            expect(status.internalStatus).toBe(TransactionStatus.APPROVED);
            expect(status.serviceStatus).toBe('APPROVED');
            expect(status.processedAt).toBeDefined();
        });

        it('should return transaction with DECLINED status', async () => {
            const mockTransaction = new Transaction(
                'trans-declined',
                'TRX-2222222222-CCC',
                TransactionStatus.DECLINED,
                'prod-888',
                'cust-999',
                1,
                Money.from(80000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(87000, 'COP'),
                new Date('2024-01-01'),
                new Date('2024-01-02'),
                'service-declined-456',
                'DECLINED',
                'Insufficient funds',
                new Date('2024-01-02'),
            );

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(
                Result.ok(mockTransaction),
            );

            mockPaymentGateway.getTransaction.mockResolvedValue(
                Result.ok({
                    transactionId: 'service-declined-456',
                    status: 'DECLINED',
                    amount: 87000,
                }),
            );

            const result = await useCase.execute('TRX-2222222222-CCC');

            expect(result.isSuccess).toBe(true);
            const status = result.getValue();
            expect(status.internalStatus).toBe(TransactionStatus.DECLINED);
            expect(status.serviceStatus).toBe('DECLINED');
            expect(status.errorMessage).toBe('Insufficient funds');
        });

        it('should return transaction with ERROR status', async () => {
            const mockTransaction = new Transaction(
                'trans-error',
                'TRX-3333333333-DDD',
                TransactionStatus.ERROR,
                'prod-111',
                'cust-222',
                1,
                Money.from(60000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(67000, 'COP'),
                new Date('2024-01-01'),
                new Date('2024-01-01'),
                undefined,
                undefined,
                'Payment gateway error',
                new Date('2024-01-01'),
            );

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(
                Result.ok(mockTransaction),
            );

            const result = await useCase.execute('TRX-3333333333-DDD');

            expect(result.isSuccess).toBe(true);
            const status = result.getValue();
            expect(status.internalStatus).toBe(TransactionStatus.ERROR);
            expect(status.errorMessage).toBe('Payment gateway error');
        });

        it('should update service status from gateway', async () => {
            const mockTransaction = new Transaction(
                'trans-update',
                'TRX-4444444444-EEE',
                TransactionStatus.PENDING,
                'prod-555',
                'cust-666',
                2,
                Money.from(100000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(107000, 'COP'),
                new Date('2024-01-01'),
                new Date('2024-01-01'),
                'service-pending-789',
                'PENDING',
            );

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(
                Result.ok(mockTransaction),
            );

            // Gateway now returns APPROVED
            mockPaymentGateway.getTransaction.mockResolvedValue(
                Result.ok({
                    transactionId: 'service-pending-789',
                    status: 'APPROVED',
                    amount: 107000,
                }),
            );

            const result = await useCase.execute('TRX-4444444444-EEE');

            expect(result.isSuccess).toBe(true);
            const status = result.getValue();
            expect(status.internalStatus).toBe(TransactionStatus.PENDING);
            expect(status.serviceStatus).toBe('APPROVED');
        });

        it('should include all transaction details in response', async () => {
            const createdAt = new Date('2024-01-01T10:00:00Z');
            const updatedAt = new Date('2024-01-02T15:30:00Z');
            const processedAt = new Date('2024-01-02T15:31:00Z');

            const mockTransaction = new Transaction(
                'trans-full',
                'TRX-7777777777-FFF',
                TransactionStatus.APPROVED,
                'prod-999',
                'cust-888',
                5,
                Money.from(250000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(10000, 'COP'),
                Money.from(262000, 'COP'),
                createdAt,
                updatedAt,
                'service-full-999',
                'APPROVED',
                undefined,
                processedAt,
            );

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(
                Result.ok(mockTransaction),
            );

            mockPaymentGateway.getTransaction.mockResolvedValue(
                Result.ok({
                    transactionId: 'service-full-999',
                    status: 'APPROVED',
                    amount: 262000,
                }),
            );

            const result = await useCase.execute('TRX-7777777777-FFF');

            expect(result.isSuccess).toBe(true);
            const status = result.getValue();
            expect(status.transactionNumber).toBe('TRX-7777777777-FFF');
            expect(status.internalStatus).toBe(TransactionStatus.APPROVED);
            expect(status.serviceStatus).toBe('APPROVED');
            expect(status.serviceTransactionId).toBe('service-full-999');
            expect(status.total).toBe(262000);
            expect(status.productId).toBe('prod-999');
            expect(status.quantity).toBe(5);
            expect(status.createdAt).toEqual(createdAt);
            expect(status.updatedAt).toEqual(updatedAt);
            expect(status.processedAt).toEqual(processedAt);
            expect(status.errorMessage).toBeUndefined();
        });

        it('should call repository with correct transaction number', async () => {
            const transactionNumber = 'TRX-TEST-123-ABC';
            const mockTransaction = new Transaction(
                'trans-test',
                transactionNumber,
                TransactionStatus.PENDING,
                'prod-test',
                'cust-test',
                1,
                Money.from(50000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(57000, 'COP'),
                new Date(),
                new Date(),
            );

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(
                Result.ok(mockTransaction),
            );

            await useCase.execute(transactionNumber);

            expect(mockTransactionRepository.findByTransactionNumber).toHaveBeenCalledWith(
                transactionNumber,
            );
            expect(mockTransactionRepository.findByTransactionNumber).toHaveBeenCalledTimes(1);
        });
    });
});
