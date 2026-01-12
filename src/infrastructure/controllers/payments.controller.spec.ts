import { PaymentsController } from './payments.controller';
import { CalculateSummaryUseCase } from '../../application/use-cases/calculate-summary.use-case';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case';
import { GetTransactionStatusUseCase } from '../../application/use-cases/get-transaction-status.use-case';
import { Result } from '../../shared/result';
import { HttpStatus, HttpException } from '@nestjs/common';

describe('PaymentsController', () => {
    let controller: PaymentsController;
    let mockCalculateSummaryUseCase: jest.Mocked<CalculateSummaryUseCase>;
    let mockProcessPaymentUseCase: jest.Mocked<ProcessPaymentUseCase>;
    let mockGetTransactionStatusUseCase: jest.Mocked<GetTransactionStatusUseCase>;

    beforeEach(() => {
        mockCalculateSummaryUseCase = {
            execute: jest.fn(),
        } as any;
        mockProcessPaymentUseCase = {
            execute: jest.fn(),
        } as any;
        mockGetTransactionStatusUseCase = {
            execute: jest.fn(),
        } as any;

        controller = new PaymentsController(
            mockCalculateSummaryUseCase,
            mockProcessPaymentUseCase,
            mockGetTransactionStatusUseCase,
        );
    });

    describe('calculateSummary', () => {
        const dto = {
            productId: 'prod-123',
            quantity: 2,
            deliveryCity: 'Bogotá',
        };

        it('should return successfully when use case succeeds', async () => {
            const mockSummary = {
                productId: 'prod-123',
                productName: 'Test Product',
                productPrice: 1000,
                quantity: 2,
                subtotal: 2000,
                baseFee: 100,
                deliveryFee: 50,
                total: 2150,
                deliveryCity: 'Bogotá',
            };

            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.ok(mockSummary));

            const result = await controller.calculateSummary(dto);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Order summary calculated successfully',
                data: mockSummary,
            });
            expect(mockCalculateSummaryUseCase.execute).toHaveBeenCalledWith(dto);
        });

        it('should throw HttpException when use case fails', async () => {
            mockCalculateSummaryUseCase.execute.mockResolvedValue(Result.fail('Product not found'));

            await expect(controller.calculateSummary(dto)).rejects.toThrow(HttpException);

            try {
                await controller.calculateSummary(dto);
            } catch (error) {
                expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
                expect(error.getResponse()).toEqual({
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Product not found',
                    error: 'CalculationError',
                });
            }
        });
    });

    describe('processPayment', () => {
        const dto = {
            productId: 'prod-123',
            quantity: 1,
            deliveryCity: 'Bogotá',
            customer: {
                email: 'test@example.com',
                phone: '3001234567',
                fullName: 'John Doe',
            },
            paymentMethod: {
                type: 'CARD',
                token: 'tok_test',
                installments: 1,
            },
        } as any;

        it('should return successfully when payment is successful', async () => {
            const mockPaymentResult = {
                success: true,
                transactionId: 'tx-123',
                transactionNumber: 'TRANS-001',
                status: 'APPROVED',
                message: 'Payment approved',
                createdAt: new Date(),
            } as any;

            mockProcessPaymentUseCase.execute.mockResolvedValue(Result.ok(mockPaymentResult));


            const result = await controller.processPayment(dto);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Payment processed successfully',
                data: mockPaymentResult,
            });
        });

        it('should return OK response when payment is rejected (success: false)', async () => {
            const mockPaymentResult = {
                success: false,
                transactionId: 'tx-123',
                transactionNumber: 'TRANS-001',
                status: 'DECLINED',
                message: 'Insufficient funds',
                createdAt: new Date(),
            } as any;

            mockProcessPaymentUseCase.execute.mockResolvedValue(Result.ok(mockPaymentResult));


            const result = await controller.processPayment(dto);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Insufficient funds',
                data: mockPaymentResult,
            });
        });

        it('should throw HttpException when use case fails', async () => {
            mockProcessPaymentUseCase.execute.mockResolvedValue(Result.fail('Internal error'));

            await expect(controller.processPayment(dto)).rejects.toThrow(HttpException);

            try {
                await controller.processPayment(dto);
            } catch (error) {
                expect(error.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
                expect(error.getResponse()).toEqual({
                    statusCode: HttpStatus.PAYMENT_REQUIRED,
                    message: 'Internal error',
                    error: 'PaymentError',
                });
            }
        });
    });

    describe('getTransactionStatus', () => {
        const dto = { transactionNumber: 'TRANS-001' };

        it('should return transaction status successfully', async () => {
            const mockStatus = {
                transactionNumber: 'TRANS-001',
                status: 'APPROVED',
                internalStatus: 'APPROVED',
                amount: 1000,
                total: 1000,
                productId: 'prod-123',
                quantity: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any;

            mockGetTransactionStatusUseCase.execute.mockResolvedValue(Result.ok(mockStatus));


            const result = await controller.getTransactionStatus(dto);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Transaction status retrieved successfully',
                data: mockStatus,
            });
            expect(mockGetTransactionStatusUseCase.execute).toHaveBeenCalledWith('TRANS-001');
        });

        it('should throw HttpException when transaction not found', async () => {
            mockGetTransactionStatusUseCase.execute.mockResolvedValue(Result.fail('Transaction not found'));

            await expect(controller.getTransactionStatus(dto)).rejects.toThrow(HttpException);

            try {
                await controller.getTransactionStatus(dto);
            } catch (error) {
                expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
                expect(error.getResponse()).toEqual({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'Transaction not found',
                    error: 'TransactionNotFound',
                });
            }
        });
    });
});
