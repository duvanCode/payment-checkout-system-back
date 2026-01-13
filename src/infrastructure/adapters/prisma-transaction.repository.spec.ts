import { PrismaTransactionRepository } from './prisma-transaction.repository';
import { PrismaService } from '../database/prisma.service';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { Money } from '../../domain/value-objects/money.vo';
import { TransactionItem } from '../../domain/entities/transaction-item.entity';

describe('PrismaTransactionRepository', () => {
    let repository: PrismaTransactionRepository;
    let mockPrismaService: jest.Mocked<PrismaService>;

    beforeEach(() => {
        mockPrismaService = {
            transaction: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        } as any;

        repository = new PrismaTransactionRepository(mockPrismaService);
    });

    describe('findById', () => {
        it('should return transaction when found', async () => {
            const mockTransaction = {
                id: 'trans-123',
                transactionNumber: 'TRX-1234567890-ABC',
                status: TransactionStatus.PENDING,
                items: [{
                    id: 'item-1',
                    productId: 'prod-456',
                    productName: 'Product',
                    quantity: 2,
                    price: 50000,
                    subtotal: 100000,
                    createdAt: new Date('2024-01-01'),
                }],
                subtotal: 100000,
                baseFee: 2000,
                deliveryFee: 5000,
                total: 107000,
                serviceTransactionId: null,
                serviceStatus: null,
                errorMessage: null,
                processedAt: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };

            mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

            const result = await repository.findById('trans-123');

            expect(result.isSuccess).toBe(true);
            const transaction = result.getValue();
            expect(transaction.getId()).toBe('trans-123');
            expect(transaction.getTransactionNumber()).toBe('TRX-1234567890-ABC');
            expect(transaction.getStatus()).toBe(TransactionStatus.PENDING);
        });

        it('should return failure when transaction not found', async () => {
            mockPrismaService.transaction.findUnique.mockResolvedValue(null);

            const result = await repository.findById('nonexistent');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Transaction not found');
        });

        it('should handle database errors', async () => {
            mockPrismaService.transaction.findUnique.mockRejectedValue(
                new Error('Database connection error'),
            );

            const result = await repository.findById('trans-123');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error finding transaction');
        });

        it('should call findUnique with correct parameters', async () => {
            const mockTransaction = {
                id: 'trans-456',
                transactionNumber: 'TRX-9876543210-XYZ',
                status: TransactionStatus.APPROVED,
                items: [{
                    id: 'item-1',
                    productId: 'prod-111',
                    productName: 'Product',
                    quantity: 1,
                    price: 50000,
                    subtotal: 50000,
                    createdAt: new Date(),
                }],
                subtotal: 50000,
                baseFee: 2000,
                deliveryFee: 5000,
                total: 57000,
                serviceTransactionId: 'service-trans-999',
                serviceStatus: 'APPROVED',
                errorMessage: null,
                processedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

            await repository.findById('trans-456');

            expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith({
                where: { id: 'trans-456' },
                include: { items: true },
            });
        });
    });

    describe('findByTransactionNumber', () => {
        it('should return transaction when found by number', async () => {
            const mockTransaction = {
                id: 'trans-search',
                transactionNumber: 'TRX-SEARCH-123',
                status: TransactionStatus.PENDING,
                items: [{
                    id: 'item-1',
                    productId: 'prod-1',
                    productName: 'Product',
                    quantity: 3,
                    price: 50000,
                    subtotal: 150000,
                    createdAt: new Date(),
                }],
                subtotal: 150000,
                baseFee: 2000,
                deliveryFee: 5000,
                total: 157000,
                serviceTransactionId: null,
                serviceStatus: null,
                errorMessage: null,
                processedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

            const result = await repository.findByTransactionNumber('TRX-SEARCH-123');

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getTransactionNumber()).toBe('TRX-SEARCH-123');
        });

        it('should return failure when transaction not found by number', async () => {
            mockPrismaService.transaction.findUnique.mockResolvedValue(null);

            const result = await repository.findByTransactionNumber('TRX-NOTFOUND-000');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Transaction not found');
        });

        it('should call findUnique with transactionNumber where clause', async () => {
            const mockTransaction = {
                id: 'trans-789',
                transactionNumber: 'TRX-TEST-789',
                status: TransactionStatus.DECLINED,
                items: [{
                    id: 'item-1',
                    productId: 'prod-1',
                    productName: 'Product',
                    quantity: 1,
                    price: 100000,
                    subtotal: 100000,
                    createdAt: new Date(),
                }],
                subtotal: 100000,
                baseFee: 2000,
                deliveryFee: 5000,
                total: 107000,
                serviceTransactionId: 'service-declined',
                serviceStatus: 'DECLINED',
                errorMessage: 'Insufficient funds',
                processedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

            await repository.findByTransactionNumber('TRX-TEST-789');

            expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith({
                where: { transactionNumber: 'TRX-TEST-789' },
                include: { items: true },
            });
        });

        it('should handle database errors', async () => {
            mockPrismaService.transaction.findUnique.mockRejectedValue(new Error('Query timeout'));

            const result = await repository.findByTransactionNumber('TRX-ERROR-001');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error finding transaction');
        });
    });

    describe('save', () => {
        it('should save new transaction successfully', async () => {
            const transaction = new Transaction(
                'trans-new',
                'TRX-NEW-123',
                TransactionStatus.PENDING,
                'cust-1',
                Money.from(100000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(107000, 'COP'),
                [new TransactionItem('item-1', 'trans-new', 'prod-1', 'Product', 2, Money.from(50000, 'COP'), Money.from(100000, 'COP'), new Date())],
                new Date(),
                new Date(),
            );

            const mockCreated = {
                id: 'trans-created',
                transactionNumber: 'TRX-NEW-123',
                status: TransactionStatus.PENDING,
                items: [{
                    id: 'item-1',
                    productId: 'prod-1',
                    productName: 'Product',
                    quantity: 2,
                    price: 50000,
                    subtotal: 100000,
                    createdAt: new Date(),
                }],
                subtotal: 100000,
                baseFee: 2000,
                deliveryFee: 5000,
                total: 107000,
                serviceTransactionId: null,
                serviceStatus: null,
                errorMessage: null,
                processedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.transaction.create.mockResolvedValue(mockCreated);

            const result = await repository.save(transaction);

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getTransactionNumber()).toBe('TRX-NEW-123');
        });

        it('should call create with correct data', async () => {
            const transaction = new Transaction(
                'trans-test',
                'TRX-TEST-456',
                TransactionStatus.PENDING,
                'cust-888',
                Money.from(150000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(10000, 'COP'),
                Money.from(162000, 'COP'),
                [new TransactionItem('item-2', 'trans-test', 'prod-999', 'Product', 3, Money.from(50000, 'COP'), Money.from(150000, 'COP'), new Date())],
                new Date(),
                new Date(),
            );

            const mockCreated = {
                id: 'trans-created',
                transactionNumber: 'TRX-TEST-456',
                status: TransactionStatus.PENDING,
                items: [{
                    id: 'item-1',
                    productId: 'prod-999',
                    productName: 'Product',
                    quantity: 3,
                    price: 50000,
                    subtotal: 150000,
                    createdAt: new Date(),
                }],
                subtotal: 150000,
                baseFee: 2000,
                deliveryFee: 10000,
                total: 162000,
                serviceTransactionId: null,
                serviceStatus: null,
                errorMessage: null,
                processedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.transaction.create.mockResolvedValue(mockCreated);

            await repository.save(transaction);

            expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
                data: {
                    transactionNumber: 'TRX-TEST-456',
                    status: TransactionStatus.PENDING,
                    customerId: 'cust-888',
                    subtotal: 150000,
                    baseFee: 2000,
                    deliveryFee: 10000,
                    total: 162000,
                    items: {
                        create: [{
                            productId: 'prod-999',
                            productName: 'Product',
                            quantity: 3,
                            price: 50000,
                            subtotal: 150000,
                        }],
                    },
                },
                include: { items: true },
            });
        });

        it('should handle unique constraint violations', async () => {
            const transaction = new Transaction(
                'trans-dup',
                'TRX-DUPLICATE-001',
                TransactionStatus.PENDING,
                'prod-1',
                'cust-1',
                1,
                Money.from(50000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(57000, 'COP'),
                new Date(),
                new Date(),
            );

            mockPrismaService.transaction.create.mockRejectedValue(
                new Error('Unique constraint failed on transactionNumber'),
            );

            const result = await repository.save(transaction);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error saving transaction');
        });
    });

    describe('update', () => {
        it('should update existing transaction successfully', async () => {
            const transaction = new Transaction(
                'trans-123',
                'TRX-UPDATE-123',
                TransactionStatus.APPROVED,
                'cust-1',
                Money.from(100000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(107000, 'COP'),
                [new TransactionItem('item-1', 'trans-123', 'prod-1', 'Product', 2, Money.from(50000, 'COP'), Money.from(100000, 'COP'), new Date('2024-01-01'))],
                new Date('2024-01-01'),
                new Date(),
                'service-trans-999',
                'APPROVED',
                undefined,
                new Date(),
            );

            const mockUpdated = {
                id: 'trans-123',
                transactionNumber: 'TRX-UPDATE-123',
                status: TransactionStatus.APPROVED,
                items: [{
                    id: 'item-1',
                    productId: 'prod-1',
                    productName: 'Product',
                    quantity: 2,
                    price: 50000,
                    subtotal: 100000,
                    createdAt: new Date('2024-01-01'),
                }],
                subtotal: 100000,
                baseFee: 2000,
                deliveryFee: 5000,
                total: 107000,
                serviceTransactionId: 'service-trans-999',
                serviceStatus: 'APPROVED',
                errorMessage: null,
                processedAt: new Date(),
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.transaction.update.mockResolvedValue(mockUpdated);

            const result = await repository.update(transaction);

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getStatus()).toBe(TransactionStatus.APPROVED);
        });

        it('should call update with correct parameters', async () => {
            const processedAt = new Date('2024-01-15T10:30:00Z');
            const transaction = new Transaction(
                'trans-456',
                'TRX-456',
                TransactionStatus.DECLINED,
                'cust-1',
                Money.from(50000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(57000, 'COP'),
                [new TransactionItem('item-1', 'trans-456', 'prod-1', 'Product', 1, Money.from(50000, 'COP'), Money.from(50000, 'COP'), new Date('2024-01-01'))],
                new Date('2024-01-01'),
                new Date(),
                'service-declined-123',
                'DECLINED',
                'Card expired',
                processedAt,
            );

            const mockUpdated = {
                id: 'trans-456',
                transactionNumber: 'TRX-456',
                status: TransactionStatus.DECLINED,
                items: [{
                    id: 'item-1',
                    productId: 'prod-1',
                    productName: 'Product',
                    quantity: 1,
                    price: 50000,
                    subtotal: 50000,
                    createdAt: new Date('2024-01-01'),
                }],
                subtotal: 50000,
                baseFee: 2000,
                deliveryFee: 5000,
                total: 57000,
                serviceTransactionId: 'service-declined-123',
                serviceStatus: 'DECLINED',
                errorMessage: 'Card expired',
                processedAt: processedAt,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.transaction.update.mockResolvedValue(mockUpdated);

            await repository.update(transaction);

            expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
                where: { id: 'trans-456' },
                data: {
                    status: TransactionStatus.DECLINED,
                    serviceTransactionId: 'service-declined-123',
                    serviceStatus: 'DECLINED',
                    errorMessage: 'Card expired',
                    processedAt: processedAt,
                    updatedAt: expect.any(Date),
                },
            });
        });

        it('should handle transaction not found errors', async () => {
            const transaction = new Transaction(
                'nonexistent',
                'TRX-NOTFOUND',
                TransactionStatus.PENDING,
                'prod-1',
                'cust-1',
                1,
                Money.from(50000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(57000, 'COP'),
                new Date(),
                new Date(),
            );

            mockPrismaService.transaction.update.mockRejectedValue(new Error('Record not found'));

            const result = await repository.update(transaction);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error updating transaction');
        });

        it('should update transaction with ERROR status', async () => {
            const transaction = new Transaction(
                'trans-error',
                'TRX-ERROR',
                TransactionStatus.ERROR,
                'cust-1',
                Money.from(50000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(57000, 'COP'),
                [new TransactionItem('item-1', 'trans-error', 'prod-1', 'Product', 1, Money.from(50000, 'COP'), Money.from(50000, 'COP'), new Date('2024-01-01'))],
                new Date('2024-01-01'),
                new Date(),
                undefined,
                undefined,
                'Payment gateway timeout',
                new Date(),
            );

            const mockUpdated = {
                id: 'trans-error',
                transactionNumber: 'TRX-ERROR',
                status: TransactionStatus.ERROR,
                items: [{
                    id: 'item-1',
                    productId: 'prod-1',
                    productName: 'Product',
                    quantity: 1,
                    price: 50000,
                    subtotal: 50000,
                    createdAt: new Date('2024-01-01'),
                }],
                subtotal: 50000,
                baseFee: 2000,
                deliveryFee: 5000,
                total: 57000,
                serviceTransactionId: null,
                serviceStatus: null,
                errorMessage: 'Payment gateway timeout',
                processedAt: new Date(),
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.transaction.update.mockResolvedValue(mockUpdated);

            const result = await repository.update(transaction);

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getStatus()).toBe(TransactionStatus.ERROR);
        });
    });

    describe('findPendingTransactions', () => {
        it('should return pending transactions with service ID', async () => {
            const mockTransactions = [
                {
                    id: 'trans-pending-1',
                    transactionNumber: 'TRX-PENDING-1',
                    status: TransactionStatus.PENDING,
                    productId: 'prod-1',
                    customerId: 'cust-1',
                    quantity: 1,
                    subtotal: 100000,
                    baseFee: 2000,
                    deliveryFee: 5000,
                    total: 107000,
                    serviceTransactionId: 'service-1',
                    serviceStatus: 'PENDING',
                    errorMessage: null,
                    processedAt: null,
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                },
                {
                    id: 'trans-pending-2',
                    transactionNumber: 'TRX-PENDING-2',
                    status: TransactionStatus.PENDING,
                    items: [{
                        id: 'item-2',
                        productId: 'prod-2',
                        productName: 'Product',
                        quantity: 2,
                        price: 100000,
                        subtotal: 200000,
                        createdAt: new Date('2024-01-02'),
                    }],
                    subtotal: 200000,
                    baseFee: 2000,
                    deliveryFee: 5000,
                    total: 207000,
                    serviceTransactionId: 'service-2',
                    serviceStatus: 'PENDING',
                    errorMessage: null,
                    processedAt: null,
                    createdAt: new Date('2024-01-02'),
                    updatedAt: new Date('2024-01-02'),
                },
            ];

            mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);

            const result = await repository.findPendingTransactions();

            expect(result.isSuccess).toBe(true);
            const transactions = result.getValue();
            expect(transactions).toHaveLength(2);
            expect(transactions[0].getStatus()).toBe(TransactionStatus.PENDING);
            expect(transactions[1].getStatus()).toBe(TransactionStatus.PENDING);
        });

        it('should call findMany with correct filters', async () => {
            mockPrismaService.transaction.findMany.mockResolvedValue([]);

            await repository.findPendingTransactions();

            expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith({
                where: {
                    status: TransactionStatus.PENDING,
                    serviceTransactionId: {
                        not: null,
                    },
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });
        });

        it('should return empty array when no pending transactions', async () => {
            mockPrismaService.transaction.findMany.mockResolvedValue([]);

            const result = await repository.findPendingTransactions();

            expect(result.isSuccess).toBe(true);
            expect(result.getValue()).toHaveLength(0);
        });

        it('should order by creation date ascending', async () => {
            const mockTransactions = [
                {
                    id: 'trans-1',
                    transactionNumber: 'TRX-1',
                    status: TransactionStatus.PENDING,
                    productId: 'prod-1',
                    customerId: 'cust-1',
                    quantity: 1,
                    subtotal: 100000,
                    baseFee: 2000,
                    deliveryFee: 5000,
                    total: 107000,
                    serviceTransactionId: 'service-1',
                    serviceStatus: 'PENDING',
                    errorMessage: null,
                    processedAt: null,
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                },
            ];

            mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);

            await repository.findPendingTransactions();

            expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { createdAt: 'asc' },
                }),
            );
        });

        it('should handle database errors', async () => {
            mockPrismaService.transaction.findMany.mockRejectedValue(new Error('Query failed'));

            const result = await repository.findPendingTransactions();

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error finding pending transactions');
        });
    });

    describe('toDomain conversion', () => {
        it('should convert database model to domain entity correctly', async () => {
            const mockTransaction = {
                id: 'trans-convert',
                transactionNumber: 'TRX-CONVERT-123',
                status: TransactionStatus.APPROVED,
                items: [{
                    id: 'item-1',
                    productId: 'prod-999',
                    productName: 'Product',
                    quantity: 5,
                    price: 50000,
                    subtotal: 250000,
                    createdAt: new Date('2024-01-01T00:00:00Z'),
                }],
                subtotal: 250000,
                baseFee: 2000,
                deliveryFee: 10000,
                total: 262000,
                serviceTransactionId: 'service-approved-999',
                serviceStatus: 'APPROVED',
                errorMessage: null,
                processedAt: new Date('2024-01-15T10:30:00Z'),
                createdAt: new Date('2024-01-01T00:00:00Z'),
                updatedAt: new Date('2024-01-15T10:31:00Z'),
            };

            mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

            const result = await repository.findById('trans-convert');

            expect(result.isSuccess).toBe(true);
            const transaction = result.getValue();
            expect(transaction.getId()).toBe('trans-convert');
            expect(transaction.getTransactionNumber()).toBe('TRX-CONVERT-123');
            expect(transaction.getStatus()).toBe(TransactionStatus.APPROVED);
            expect(transaction.getTotal().getAmount()).toBe(262000);
        });

        it('should handle numeric string amounts', async () => {
            const mockTransaction = {
                id: 'trans-string',
                transactionNumber: 'TRX-STRING',
                status: TransactionStatus.PENDING,
                items: [{
                    id: 'item-1',
                    productId: 'prod-1',
                    productName: 'Product',
                    quantity: 1,
                    price: 100000,
                    subtotal: 100000,
                    createdAt: new Date(),
                }],
                subtotal: '100000',
                baseFee: '2000',
                deliveryFee: '5000',
                total: '107000',
                serviceTransactionId: null,
                serviceStatus: null,
                errorMessage: null,
                processedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

            const result = await repository.findById('trans-string');

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getTotal().getAmount()).toBe(107000);
        });

        it('should handle transactions without service fields', async () => {
            const mockTransaction = {
                id: 'trans-no-service',
                transactionNumber: 'TRX-NO-SERVICE',
                status: TransactionStatus.PENDING,
                items: [{
                    id: 'item-1',
                    productId: 'prod-1',
                    productName: 'Product',
                    quantity: 1,
                    price: 50000,
                    subtotal: 50000,
                    createdAt: new Date(),
                }],
                subtotal: 50000,
                baseFee: 2000,
                deliveryFee: 5000,
                total: 57000,
                serviceTransactionId: null,
                serviceStatus: null,
                errorMessage: null,
                processedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

            const result = await repository.findById('trans-no-service');

            expect(result.isSuccess).toBe(true);
            const json = result.getValue().toJSON();
            expect(json.serviceTransactionId).toBeNull();
            expect(json.serviceStatus).toBeNull();
        });
    });
});
