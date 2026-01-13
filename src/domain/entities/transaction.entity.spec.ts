import { Transaction } from './transaction.entity';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { Money } from '../value-objects/money.vo';
import { TransactionItem } from './transaction-item.entity';

describe('Transaction Entity', () => {
    const mockDate = new Date('2024-01-01');
    let sampleTransaction: Transaction;
    let mockItems: TransactionItem[];

    beforeEach(() => {
        mockItems = [
            new TransactionItem(
                'item-1',
                'trans-123',
                'prod-456',
                'Product Name',
                2,
                Money.from(50000, 'COP'),
                Money.from(100000, 'COP'),
                mockDate,
            )
        ];

        sampleTransaction = new Transaction(
            'trans-123',
            'TRX-1234567890-ABC123',
            TransactionStatus.PENDING,
            'cust-789',
            Money.from(100000, 'COP'),
            Money.from(5000, 'COP'),
            Money.from(10000, 'COP'),
            Money.from(115000, 'COP'),
            mockItems,
            mockDate,
            mockDate,
        );
    });


    describe('constructor', () => {
        it('should create transaction with all required properties', () => {
            expect(sampleTransaction.getId()).toBe('trans-123');
            expect(sampleTransaction.getTransactionNumber()).toBe('TRX-1234567890-ABC123');
            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.PENDING);
            expect(sampleTransaction.getTotal().getAmount()).toBe(115000);
        });

        it('should create transaction without id (new transaction)', () => {
            const transaction = new Transaction(
                undefined,
                'TRX-9999999999-XYZ789',
                TransactionStatus.PENDING,
                'cust-789',
                Money.from(50000, 'COP'),
                Money.from(2500, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(57500, 'COP'),
                mockItems,
                mockDate,
                mockDate,
            );

            expect(transaction.getId()).toBeUndefined();
        });

        it('should create transaction with optional service fields', () => {
            const transaction = new Transaction(
                'trans-456',
                'TRX-1234567890-ABC123',
                TransactionStatus.APPROVED,
                'cust-789',
                Money.from(100000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(10000, 'COP'),
                Money.from(115000, 'COP'),
                mockItems,
                mockDate,
                mockDate,
                'service-trans-789',
                'APPROVED',
                undefined,
                mockDate,
            );

            const json = transaction.toJSON();
            expect(json.serviceTransactionId).toBe('service-trans-789');
            expect(json.serviceStatus).toBe('APPROVED');
            expect(json.processedAt).toEqual(mockDate);
        });
    });

    describe('generateTransactionNumber', () => {
        it('should generate transaction number with correct format', () => {
            const transactionNumber = Transaction.generateTransactionNumber();

            expect(transactionNumber).toMatch(/^TRX-\d+-[A-Z0-9]{6}$/);
        });

        it('should generate unique transaction numbers', () => {
            const number1 = Transaction.generateTransactionNumber();
            const number2 = Transaction.generateTransactionNumber();

            expect(number1).not.toBe(number2);
        });

        it('should start with TRX- prefix', () => {
            const transactionNumber = Transaction.generateTransactionNumber();

            expect(transactionNumber.startsWith('TRX-')).toBe(true);
        });

        it('should generate multiple unique transaction numbers', () => {
            const numbers = Array.from({ length: 10 }, () =>
                Transaction.generateTransactionNumber(),
            );
            const uniqueNumbers = new Set(numbers);

            expect(uniqueNumbers.size).toBe(10);
        });
    });

    describe('status checks', () => {
        it('should return true for isPending when status is PENDING', () => {
            expect(sampleTransaction.isPending()).toBe(true);
            expect(sampleTransaction.isApproved()).toBe(false);
        });

        it('should return true for isApproved when status is APPROVED', () => {
            const transaction = new Transaction(
                'trans-123',
                'TRX-1234567890-ABC123',
                TransactionStatus.APPROVED,
                'cust-789',
                Money.from(100000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(10000, 'COP'),
                Money.from(115000, 'COP'),
                mockItems,
                mockDate,
                mockDate,
            );

            expect(transaction.isApproved()).toBe(true);
            expect(transaction.isPending()).toBe(false);
        });

        it('should return false for both when status is DECLINED', () => {
            const transaction = new Transaction(
                'trans-123',
                'TRX-1234567890-ABC123',
                TransactionStatus.DECLINED,
                'cust-789',
                Money.from(100000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(10000, 'COP'),
                Money.from(115000, 'COP'),
                mockItems,
                mockDate,
                mockDate,
            );

            expect(transaction.isApproved()).toBe(false);
            expect(transaction.isPending()).toBe(false);
        });
    });

    describe('updateFromService', () => {
        it('should update transaction to APPROVED status', () => {
            sampleTransaction.updateFromService('service-123', 'APPROVED');

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.APPROVED);
            const json = sampleTransaction.toJSON();
            expect(json.serviceTransactionId).toBe('service-123');
            expect(json.serviceStatus).toBe('APPROVED');
            expect(json.processedAt).toBeDefined();
        });

        it('should update transaction to DECLINED status', () => {
            sampleTransaction.updateFromService('service-456', 'DECLINED');

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.DECLINED);
            const json = sampleTransaction.toJSON();
            expect(json.serviceStatus).toBe('DECLINED');
        });

        it('should update transaction to DECLINED when VOIDED', () => {
            sampleTransaction.updateFromService('service-789', 'VOIDED');

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.DECLINED);
            const json = sampleTransaction.toJSON();
            expect(json.serviceStatus).toBe('VOIDED');
        });

        it('should update transaction to ERROR status', () => {
            sampleTransaction.updateFromService('service-999', 'ERROR');

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.ERROR);
        });

        it('should keep PENDING status for unknown service status', () => {
            sampleTransaction.updateFromService('service-111', 'UNKNOWN_STATUS');

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.PENDING);
        });

        it('should handle lowercase service status', () => {
            sampleTransaction.updateFromService('service-222', 'approved');

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.APPROVED);
        });

        it('should handle mixed case service status', () => {
            sampleTransaction.updateFromService('service-333', 'Declined');

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.DECLINED);
        });

        it('should update processedAt timestamp', () => {
            const beforeUpdate = new Date();
            sampleTransaction.updateFromService('service-444', 'APPROVED');
            const afterUpdate = new Date();

            const json = sampleTransaction.toJSON();
            expect(json.processedAt).toBeDefined();
            if (json.processedAt) {
                expect(json.processedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
                expect(json.processedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
            }
        });
    });

    describe('approve', () => {
        it('should approve transaction', () => {
            sampleTransaction.approve('service-approved-123', 'APPROVED');

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.APPROVED);
            expect(sampleTransaction.isApproved()).toBe(true);
            const json = sampleTransaction.toJSON();
            expect(json.serviceTransactionId).toBe('service-approved-123');
            expect(json.serviceStatus).toBe('APPROVED');
            expect(json.processedAt).toBeDefined();
        });

        it('should update processedAt when approving', () => {
            const beforeApproval = new Date();
            sampleTransaction.approve('service-555', 'APPROVED');
            const afterApproval = new Date();

            const json = sampleTransaction.toJSON();
            if (json.processedAt) {
                expect(json.processedAt.getTime()).toBeGreaterThanOrEqual(beforeApproval.getTime());
                expect(json.processedAt.getTime()).toBeLessThanOrEqual(afterApproval.getTime());
            }
        });
    });

    describe('decline', () => {
        it('should decline transaction without error message', () => {
            sampleTransaction.decline('service-declined-456', 'DECLINED');

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.DECLINED);
            const json = sampleTransaction.toJSON();
            expect(json.serviceTransactionId).toBe('service-declined-456');
            expect(json.serviceStatus).toBe('DECLINED');
            expect(json.errorMessage).toBeUndefined();
            expect(json.processedAt).toBeDefined();
        });

        it('should decline transaction with error message', () => {
            sampleTransaction.decline(
                'service-declined-789',
                'DECLINED',
                'Insufficient funds',
            );

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.DECLINED);
            const json = sampleTransaction.toJSON();
            expect(json.errorMessage).toBe('Insufficient funds');
        });

        it('should update processedAt when declining', () => {
            const beforeDecline = new Date();
            sampleTransaction.decline('service-666', 'DECLINED', 'Card expired');
            const afterDecline = new Date();

            const json = sampleTransaction.toJSON();
            if (json.processedAt) {
                expect(json.processedAt.getTime()).toBeGreaterThanOrEqual(beforeDecline.getTime());
                expect(json.processedAt.getTime()).toBeLessThanOrEqual(afterDecline.getTime());
            }
        });
    });

    describe('setError', () => {
        it('should set error status with message', () => {
            sampleTransaction.setError('Payment gateway timeout');

            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.ERROR);
            const json = sampleTransaction.toJSON();
            expect(json.errorMessage).toBe('Payment gateway timeout');
            expect(json.processedAt).toBeDefined();
        });

        it('should update processedAt when setting error', () => {
            const beforeError = new Date();
            sampleTransaction.setError('Network error');
            const afterError = new Date();

            const json = sampleTransaction.toJSON();
            if (json.processedAt) {
                expect(json.processedAt.getTime()).toBeGreaterThanOrEqual(beforeError.getTime());
                expect(json.processedAt.getTime()).toBeLessThanOrEqual(afterError.getTime());
            }
        });
    });

    describe('toJSON', () => {
        it('should serialize transaction to JSON with all fields', () => {
            const json = sampleTransaction.toJSON();

            expect(json).toEqual({
                id: 'trans-123',
                transactionNumber: 'TRX-1234567890-ABC123',
                status: TransactionStatus.PENDING,
                customerId: 'cust-789',
                items: mockItems.map(item => item.toJSON()),
                subtotal: 100000,
                baseFee: 5000,
                deliveryFee: 10000,
                total: 115000,
                serviceTransactionId: undefined,
                serviceStatus: undefined,
                errorMessage: undefined,
                createdAt: mockDate,
                updatedAt: mockDate,
                processedAt: undefined,
            });
        });

        it('should serialize approved transaction', () => {
            sampleTransaction.approve('service-999', 'APPROVED');
            const json = sampleTransaction.toJSON();

            expect(json.status).toBe(TransactionStatus.APPROVED);
            expect(json.serviceTransactionId).toBe('service-999');
            expect(json.processedAt).toBeDefined();
        });

        it('should serialize declined transaction with error', () => {
            sampleTransaction.decline('service-888', 'DECLINED', 'Card declined');
            const json = sampleTransaction.toJSON();

            expect(json.status).toBe(TransactionStatus.DECLINED);
            expect(json.errorMessage).toBe('Card declined');
        });
    });

    describe('transaction lifecycle', () => {
        it('should handle complete approval flow', () => {
            expect(sampleTransaction.isPending()).toBe(true);

            sampleTransaction.updateFromService('service-complete-123', 'APPROVED');

            expect(sampleTransaction.isPending()).toBe(false);
            expect(sampleTransaction.isApproved()).toBe(true);
            const json = sampleTransaction.toJSON();
            expect(json.processedAt).toBeDefined();
        });

        it('should handle complete decline flow', () => {
            expect(sampleTransaction.isPending()).toBe(true);

            sampleTransaction.decline('service-complete-456', 'DECLINED', 'Fraud detection');

            expect(sampleTransaction.isPending()).toBe(false);
            expect(sampleTransaction.isApproved()).toBe(false);
            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.DECLINED);
        });

        it('should handle error flow', () => {
            expect(sampleTransaction.isPending()).toBe(true);

            sampleTransaction.setError('Gateway unavailable');

            expect(sampleTransaction.isPending()).toBe(false);
            expect(sampleTransaction.isApproved()).toBe(false);
            expect(sampleTransaction.getStatus()).toBe(TransactionStatus.ERROR);
        });
    });
});
