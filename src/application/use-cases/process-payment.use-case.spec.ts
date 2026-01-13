import { ProcessPaymentUseCase } from './process-payment.use-case';
import { TransactionRepositoryPort } from '../ports/transaction.repository.port';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { CalculateSummaryUseCase } from './calculate-summary.use-case';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { Money } from '../../domain/value-objects/money.vo';
import { Result } from '../../shared/result';
import { TransactionItem } from '../../domain/entities/transaction-item.entity';

describe('ProcessPaymentUseCase', () => {
    let useCase: ProcessPaymentUseCase;
    let mockTransactionRepository: jest.Mocked<TransactionRepositoryPort>;
    let mockPaymentGateway: jest.Mocked<PaymentGatewayPort>;
    let mockCalculateSummaryUseCase: jest.Mocked<CalculateSummaryUseCase>;
    let mockCreateTransactionUseCase: jest.Mocked<CreateTransactionUseCase>;

    const validPaymentRequest = {
        items: [
            { productId: 'prod-123', quantity: 2 }
        ],
        deliveryCity: 'Bogotá',
        deliveryAddress: 'Calle 123 #45-67',
        deliveryDepartment: 'Cundinamarca',
        customerEmail: 'test@example.com',
        customerPhone: '3001234567',
        customerFullName: 'John Doe',
        cardToken: 'tok_test_12345',
    };

    const mockOrderSummary = {
        items: [
            {
                productId: 'prod-123',
                productName: 'Gaming Laptop',
                productPrice: 50000,
                quantity: 2,
                subtotal: 100000,
            }
        ],
        subtotal: 100000,
        fees: {
            base: 2000,
            delivery: 5000,
        },
        total: 107000,
        deliveryCity: 'Bogotá',
    };


    const mockTransactionItems = [
        new TransactionItem(
            'item-1',
            'trans-456',
            'prod-123',
            'Gaming Laptop',
            2,
            Money.from(50000, 'COP'),
            Money.from(100000, 'COP'),
            new Date('2024-01-01'),
        )
    ];

    const mockTransaction = new Transaction(
        'trans-456',
        'TRX-1234567890-ABC',
        TransactionStatus.PENDING,
        'cust-789',
        Money.from(100000, 'COP'),
        Money.from(2000, 'COP'),
        Money.from(5000, 'COP'),
        Money.from(107000, 'COP'),
        mockTransactionItems,
        new Date('2024-01-01'),
        new Date('2024-01-01'),
    );

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

        mockCalculateSummaryUseCase = {
            execute: jest.fn(),
        } as any;

        mockCreateTransactionUseCase = {
            execute: jest.fn(),
        } as any;

        useCase = new ProcessPaymentUseCase(
            mockTransactionRepository,
            mockPaymentGateway,
            mockCalculateSummaryUseCase,
            mockCreateTransactionUseCase,
        );
    });

    describe('execute - successful payment flow', () => {
        it('should process payment successfully with APPROVED status', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'wompi-trans-999',
                    status: 'APPROVED',
                    amount: 107000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isSuccess).toBe(true);
            const paymentResult = result.getValue();
            expect(paymentResult.success).toBe(true);
            expect(paymentResult.transactionNumber).toBe('TRX-1234567890-ABC');
            expect(paymentResult.status).toBe(TransactionStatus.APPROVED);
            expect(paymentResult.message).toContain('Payment approved');
            expect(paymentResult.product!.id).toBe('prod-123');
            expect(paymentResult.product!.name).toBe('Gaming Laptop');
        });

        it('should process payment successfully with PENDING status', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'wompi-pending-123',
                    status: 'PENDING',
                    amount: 107000,
                    statusMessage: 'PENDING',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isSuccess).toBe(true);
            const paymentResult = result.getValue();
            expect(paymentResult.success).toBe(true);
            expect(paymentResult.status).toBe(TransactionStatus.PENDING);
            expect(paymentResult.message).toContain('Payment is being processed');
        });

        it('should update transaction with service ID and status', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'wompi-update-456',
                    status: 'APPROVED',
                    amount: 107000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );

            const updateSpy = jest.spyOn(mockTransactionRepository, 'update');

            await useCase.execute(validPaymentRequest);

            expect(updateSpy).toHaveBeenCalledWith(mockTransaction);
        });

        it('should call calculateSummary with correct parameters', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'APPROVED',
                    amount: 107000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            await useCase.execute(validPaymentRequest);

            expect(mockCalculateSummaryUseCase.execute).toHaveBeenCalledWith({
                items: [
                    { productId: 'prod-123', quantity: 2 },
                ],
                deliveryCity: 'Bogotá',
            });
        });

        it('should call createTransaction with correct parameters', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'APPROVED',
                    amount: 107000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            await useCase.execute(validPaymentRequest);

            expect(mockCreateTransactionUseCase.execute).toHaveBeenCalledWith({
                items: [
                    { productId: 'prod-123', quantity: 2, price: 50000, productName: 'Gaming Laptop', subtotal: 100000 }
                ],
                subtotal: 100000,
                baseFee: 2000,
                deliveryFee: 5000,
                total: 107000,
                customerEmail: 'test@example.com',
                customerPhone: '3001234567',
                customerFullName: 'John Doe',
            });
        });

        it('should call payment gateway with correct parameters', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'APPROVED',
                    amount: 107000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            await useCase.execute(validPaymentRequest);

            expect(mockPaymentGateway.processPayment).toHaveBeenCalledWith({
                amount: 107000,
                currency: 'COP',
                reference: 'TRX-1234567890-ABC',
                customerEmail: 'test@example.com',
                cardToken: 'tok_test_12345',
            });
        });

        it('should include processedAt timestamp in result', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'APPROVED',
                    amount: 107000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const beforeProcess = new Date();
            const result = await useCase.execute(validPaymentRequest);
            const afterProcess = new Date();

            const paymentResult = result.getValue();
            expect(paymentResult.processedAt).toBeDefined();
            expect(paymentResult.processedAt!.getTime()).toBeGreaterThanOrEqual(
                beforeProcess.getTime(),
            );
            expect(paymentResult.processedAt!.getTime()).toBeLessThanOrEqual(
                afterProcess.getTime(),
            );
        });
    });

    describe('execute - validation errors', () => {
        it('should fail when calculateSummary fails (insufficient stock)', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(
                Result.fail('Insufficient stock. Available: 1, Requested: 2'),
            );

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Insufficient stock');
            expect(mockCreateTransactionUseCase.execute).not.toHaveBeenCalled();
            expect(mockPaymentGateway.processPayment).not.toHaveBeenCalled();
        });

        it('should fail when calculateSummary fails (product not found)', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(
                Result.fail('Product not found'),
            );

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Product not found');
            expect(mockCreateTransactionUseCase.execute).not.toHaveBeenCalled();
        });

        it('should fail when createTransaction fails', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(
                Result.fail('Failed to create transaction: Database error'),
            );

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Failed to create transaction');
            expect(mockPaymentGateway.processPayment).not.toHaveBeenCalled();
        });

        it('should fail when invalid quantity (zero)', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(
                Result.fail('Quantity must be greater than 0'),
            );

            const invalidRequest = {
                ...validPaymentRequest,
                items: [{ ...validPaymentRequest.items[0], quantity: 0 }]
            };
            const result = await useCase.execute(invalidRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Quantity must be greater than 0');
        });
    });

    describe('execute - payment gateway errors', () => {
        it('should return error result when payment gateway fails', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.fail('Payment gateway timeout'),
            );

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isSuccess).toBe(true); // Returns Result.ok with error details
            const paymentResult = result.getValue();
            expect(paymentResult.success).toBe(false);
            expect(paymentResult.status).toBe(TransactionStatus.ERROR);
            expect(paymentResult.message).toBe('Payment processing failed');
            expect(paymentResult.error).toBeDefined();
            expect(paymentResult.error!.code).toBe('PAYMENT_GATEWAY_ERROR');
            expect(paymentResult.error!.message).toBe('Payment gateway timeout');
        });

        it('should return error result when gateway connection fails', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.fail('Network error: Connection refused'),
            );

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isSuccess).toBe(true);
            const paymentResult = result.getValue();
            expect(paymentResult.success).toBe(false);
            expect(paymentResult.error!.message).toContain('Network error');
        });

        it('should include transaction number in error result', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.fail('Card declined'),
            );

            const result = await useCase.execute(validPaymentRequest);

            const paymentResult = result.getValue();
            expect(paymentResult.transactionNumber).toBe('TRX-1234567890-ABC');
        });
    });

    describe('execute - exception handling', () => {
        it('should catch and handle exceptions from calculateSummary', async () => {
            mockCalculateSummaryUseCase.execute.mockRejectedValue(
                new Error('Unexpected database error'),
            );

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Payment processing error');
            expect(result.getError()).toContain('Unexpected database error');
        });

        it('should catch and handle exceptions from createTransaction', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockRejectedValue(
                new Error('Database connection lost'),
            );

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Database connection lost');
        });

        it('should catch and handle exceptions from payment gateway', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockRejectedValue(
                new Error('Gateway service unavailable'),
            );

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Gateway service unavailable');
        });

        it('should catch and handle exceptions from transaction update', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'APPROVED',
                    amount: 107000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockRejectedValue(
                new Error('Update failed'),
            );

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Update failed');
        });
    });

    describe('getMessageForStatus', () => {
        it('should return correct message for PENDING status', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'PENDING',
                    amount: 107000,
                    statusMessage: 'PENDING',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const result = await useCase.execute(validPaymentRequest);

            const paymentResult = result.getValue();
            expect(paymentResult.message).toBe(
                'Payment is being processed. You will receive a confirmation soon.',
            );
        });

        it('should return correct message for APPROVED status', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'APPROVED',
                    amount: 107000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const result = await useCase.execute(validPaymentRequest);

            const paymentResult = result.getValue();
            expect(paymentResult.message).toBe('Payment approved. Processing your order.');
        });

        it('should return correct message for DECLINED status', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'DECLINED',
                    amount: 107000,
                    statusMessage: 'DECLINED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const result = await useCase.execute(validPaymentRequest);

            const paymentResult = result.getValue();
            expect(paymentResult.message).toBe('Payment was declined.');
        });

        it('should return correct message for ERROR status', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.fail('Gateway error'),
            );

            const result = await useCase.execute(validPaymentRequest);

            const paymentResult = result.getValue();
            expect(paymentResult.message).toBe('Payment processing failed');
        });
    });

    describe('complete payment workflow', () => {
        it('should execute all steps in correct sequence for successful payment', async () => {
            const calculateSpy = jest
                .spyOn(mockCalculateSummaryUseCase, 'execute')
                .mockResolvedValue(Result.ok(mockOrderSummary));
            const createSpy = jest
                .spyOn(mockCreateTransactionUseCase, 'execute')
                .mockResolvedValue(Result.ok(mockTransaction));
            const gatewaySpy = jest
                .spyOn(mockPaymentGateway, 'processPayment')
                .mockResolvedValue(
                    Result.ok({
                        transactionId: 'test',
                        status: 'APPROVED',
                        amount: 107000,
                        statusMessage: 'APPROVED',
                        reference: 'TRX-1234567890-ABC',
                        currency: 'COP',
                        paymentMethod: 'CARD',
                        createdAt: new Date().toISOString(),
                    }),
                );
            const updateSpy = jest
                .spyOn(mockTransactionRepository, 'update')
                .mockResolvedValue(Result.ok(mockTransaction));

            await useCase.execute(validPaymentRequest);

            expect(calculateSpy).toHaveBeenCalled();
            expect(createSpy).toHaveBeenCalled();
            expect(gatewaySpy).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
        });

        it('should stop workflow if calculateSummary fails', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(
                Result.fail('Product not found'),
            );

            await useCase.execute(validPaymentRequest);

            expect(mockCreateTransactionUseCase.execute).not.toHaveBeenCalled();
            expect(mockPaymentGateway.processPayment).not.toHaveBeenCalled();
            expect(mockTransactionRepository.update).not.toHaveBeenCalled();
        });

        it('should stop workflow if createTransaction fails', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(
                Result.fail('Transaction creation failed'),
            );

            await useCase.execute(validPaymentRequest);

            expect(mockPaymentGateway.processPayment).not.toHaveBeenCalled();
            expect(mockTransactionRepository.update).not.toHaveBeenCalled();
        });

        it('should not update transaction if payment gateway fails', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.fail('Gateway error'),
            );

            await useCase.execute(validPaymentRequest);

            expect(mockTransactionRepository.update).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle large transaction amounts', async () => {
            const largeOrderSummary = {
                ...mockOrderSummary,
                subtotal: 10000000,
                total: 10012000,
            };

            mockCalculateSummaryUseCase.execute.mockResolvedValue(
                Result.ok(largeOrderSummary),
            );
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'APPROVED',
                    amount: 10012000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const result = await useCase.execute(validPaymentRequest);

            expect(result.isSuccess).toBe(true);
        });

        it('should handle single quantity orders', async () => {
            const singleQuantityRequest = {
                ...validPaymentRequest,
                items: [{ ...validPaymentRequest.items[0], quantity: 1 }]
            };
            const singleSummary = {
                ...mockOrderSummary,
                items: [{ ...mockOrderSummary.items[0], quantity: 1 }],
                subtotal: 50000
            };

            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(singleSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'APPROVED',
                    amount: 57000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const result = await useCase.execute(singleQuantityRequest);

            expect(result.isSuccess).toBe(true);
        });

        it('should handle different delivery cities', async () => {
            const nationalRequest = { ...validPaymentRequest, deliveryCity: 'Medellín' };
            const nationalSummary = {
                ...mockOrderSummary,
                fees: { ...mockOrderSummary.fees, delivery: 10000 },
                total: 112000
            };

            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(nationalSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'APPROVED',
                    amount: 112000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const result = await useCase.execute(nationalRequest);

            expect(result.isSuccess).toBe(true);
        });

        it('should include product information in successful result', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockOrderSummary));
            mockCreateTransactionUseCase.execute.mockResolvedValue(Result.ok(mockTransaction));
            mockPaymentGateway.processPayment.mockResolvedValue(
                Result.ok({
                    transactionId: 'test',
                    status: 'APPROVED',
                    amount: 107000,
                    statusMessage: 'APPROVED',
                    reference: 'TRX-1234567890-ABC',
                    currency: 'COP',
                    paymentMethod: 'CARD',
                    createdAt: new Date().toISOString(),
                }),
            );
            mockTransactionRepository.update.mockResolvedValue(Result.ok(mockTransaction));

            const result = await useCase.execute(validPaymentRequest);

            const paymentResult = result.getValue();
            expect(paymentResult.product).toBeDefined();
            expect(paymentResult.product!.id).toBe('prod-123');
            expect(paymentResult.product!.name).toBe('Gaming Laptop');
            expect(paymentResult.product!.updatedStock).toBe(0);
        });
    });
});
