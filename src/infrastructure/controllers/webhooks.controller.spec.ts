import { WebhooksController } from './webhooks.controller';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';
import { DeliveryRepositoryPort } from '../../application/ports/delivery.repository.port';
import { UpdateStockUseCase } from '../../application/use-cases/update-stock.use-case';
import { Result } from '../../shared/result';
import { HttpStatus, HttpException } from '@nestjs/common';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';

describe('WebhooksController', () => {
    let controller: WebhooksController;
    let mockTransactionRepository: jest.Mocked<TransactionRepositoryPort>;
    let mockDeliveryRepository: jest.Mocked<DeliveryRepositoryPort>;
    let mockUpdateStockUseCase: jest.Mocked<UpdateStockUseCase>;

    beforeEach(() => {
        mockTransactionRepository = {
            findByTransactionNumber: jest.fn(),
            update: jest.fn(),
        } as any;
        mockDeliveryRepository = {
            findByTransactionId: jest.fn(),
            save: jest.fn(),
        } as any;
        mockUpdateStockUseCase = {
            execute: jest.fn(),
        } as any;

        controller = new WebhooksController(
            mockTransactionRepository,
            mockDeliveryRepository,
            mockUpdateStockUseCase,
        );
    });

    describe('handleserviceWebhook', () => {
        const webhookDto = {
            event: 'transaction.updated',
            data: {
                transaction: {
                    id: 'wompi-tx-123',
                    reference: 'TRANS-001',
                    status: 'APPROVED',
                    amount_in_cents: 100000,
                },
            },
        } as any;

        it('should process approved transaction successfully', async () => {
            const mockTransaction = {
                getId: () => 'tx-123',
                isApproved: () => false,
                getStatus: () => TransactionStatus.PENDING,
                approve: jest.fn(),
                productId: 'prod-1',
                quantity: 2,
            };

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(Result.ok(mockTransaction));
            mockTransactionRepository.update.mockResolvedValue(Result.ok(undefined));
            mockUpdateStockUseCase.execute.mockResolvedValue(Result.ok(undefined));
            mockDeliveryRepository.findByTransactionId.mockResolvedValue(Result.fail('Not found'));
            mockDeliveryRepository.save.mockResolvedValue(Result.ok(undefined));

            const result = await controller.handleserviceWebhook(webhookDto);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Webhook processed successfully',
            });
            expect(mockTransaction.approve).toHaveBeenCalled();
            expect(mockUpdateStockUseCase.execute).toHaveBeenCalledWith('prod-1', 2);
            expect(mockDeliveryRepository.save).toHaveBeenCalled();
        });

        it('should process declined transaction successfully', async () => {
            const declinedWebhook = {
                ...webhookDto,
                data: {
                    transaction: {
                        ...webhookDto.data.transaction,
                        status: 'DECLINED',
                        status_message: 'Insufficient funds',
                    },
                },
            };

            const mockTransaction = {
                getId: () => 'tx-123',
                isApproved: () => false,
                getStatus: () => TransactionStatus.PENDING,
                decline: jest.fn(),
            };

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(Result.ok(mockTransaction));
            mockTransactionRepository.update.mockResolvedValue(Result.ok(undefined));

            const result = await controller.handleserviceWebhook(declinedWebhook);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Webhook processed successfully',
            });
            expect(mockTransaction.decline).toHaveBeenCalledWith(
                'wompi-tx-123',
                'DECLINED',
                'Insufficient funds',
            );
        });

        it('should ignore already processed transaction (APPROVED)', async () => {
            const mockTransaction = {
                isApproved: () => true,
                getStatus: () => TransactionStatus.APPROVED,
            };

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(Result.ok(mockTransaction));

            const result = await controller.handleserviceWebhook(webhookDto);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Webhook received (already processed)',
            });
            expect(mockTransactionRepository.update).not.toHaveBeenCalled();
        });

        it('should ignore already processed transaction (DECLINED)', async () => {
            const mockTransaction = {
                isApproved: () => false,
                getStatus: () => TransactionStatus.DECLINED,
            };

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(Result.ok(mockTransaction));

            const result = await controller.handleserviceWebhook(webhookDto);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Webhook received (already processed)',
            });
        });

        it('should throw NOT_FOUND when transaction does not exist', async () => {
            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(Result.fail('Not found'));
            jest.spyOn((controller as any).logger, 'warn').mockImplementation(() => { });

            await expect(controller.handleserviceWebhook(webhookDto)).rejects.toThrow(HttpException);

            try {
                await controller.handleserviceWebhook(webhookDto);
            } catch (error) {
                expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
            }
        });

        it('should handle errors during processing and return INTERNAL_SERVER_ERROR', async () => {
            mockTransactionRepository.findByTransactionNumber.mockRejectedValue(new Error('Unexpected error'));
            jest.spyOn((controller as any).logger, 'error').mockImplementation(() => { });

            await expect(controller.handleserviceWebhook(webhookDto)).rejects.toThrow(HttpException);

            try {
                await controller.handleserviceWebhook(webhookDto);
            } catch (error) {
                expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
            }
        });

        it('should not create delivery if it already exists for approved transaction', async () => {
            const mockTransaction = {
                getId: () => 'tx-123',
                isApproved: () => false,
                getStatus: () => TransactionStatus.PENDING,
                approve: jest.fn(),
                productId: 'prod-1',
                quantity: 1,
            };

            mockTransactionRepository.findByTransactionNumber.mockResolvedValue(Result.ok(mockTransaction));
            mockTransactionRepository.update.mockResolvedValue(Result.ok(undefined));
            mockUpdateStockUseCase.execute.mockResolvedValue(Result.ok(undefined));
            mockDeliveryRepository.findByTransactionId.mockResolvedValue(Result.ok({}));

            await controller.handleserviceWebhook(webhookDto);

            expect(mockDeliveryRepository.save).not.toHaveBeenCalled();
        });
    });
});
