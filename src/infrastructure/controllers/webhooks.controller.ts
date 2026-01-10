import {
    Controller,
    Post,
    Body,
    HttpStatus,
    HttpException,
    Logger,
    Inject,
} from '@nestjs/common';
import { ServiceWebhookDto } from '../../application/dtos/service-webhook.dto';
import {
    type TransactionRepositoryPort,
    TRANSACTION_REPOSITORY,
} from '../../application/ports/transaction.repository.port';
import {
    type DeliveryRepositoryPort,
    DELIVERY_REPOSITORY,
} from '../../application/ports/delivery.repository.port';
import { UpdateStockUseCase } from '../../application/use-cases/update-stock.use-case';
import { Delivery } from '../../domain/entities/delivery.entity';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';

@Controller('api/webhooks')
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(
        @Inject(TRANSACTION_REPOSITORY)
        private readonly transactionRepository: TransactionRepositoryPort,
        @Inject(DELIVERY_REPOSITORY)
        private readonly deliveryRepository: DeliveryRepositoryPort,
        private readonly updateStockUseCase: UpdateStockUseCase,
    ) { }

    @Post('service')
    async handleserviceWebhook(@Body() webhook: serviceWebhookDto) {
        try {
            this.logger.log(`Received service webhook: ${webhook.event}`);
            this.logger.log(`Transaction data: ${JSON.stringify(webhook.data.transaction)}`);

            const transaction = webhook.data.transaction;

            // Buscar transacción por reference (transactionNumber)
            const transactionResult = await this.transactionRepository.findByTransactionNumber(
                transaction.reference,
            );

            if (transactionResult.isFailure) {
                this.logger.warn(`Transaction not found: ${transaction.reference}`);
                throw new HttpException(
                    {
                        statusCode: HttpStatus.NOT_FOUND,
                        message: 'Transaction not found',
                        error: 'TransactionNotFound',
                    },
                    HttpStatus.NOT_FOUND,
                );
            }

            const existingTransaction = transactionResult.getValue();

            // Si ya fue procesada, ignorar webhook
            if (existingTransaction.isApproved() || existingTransaction.getStatus() === TransactionStatus.DECLINED) {
                this.logger.log(`Transaction already processed: ${transaction.reference}`);
                return {
                    statusCode: HttpStatus.OK,
                    message: 'Webhook received (already processed)',
                };
            }

            // Procesar según el status de service
            if (transaction.status === 'APPROVED') {
                await this.handleApprovedTransaction(existingTransaction, transaction);
            } else if (transaction.status === 'DECLINED' || transaction.status === 'ERROR') {
                await this.handleDeclinedTransaction(existingTransaction, transaction);
            }

            return {
                statusCode: HttpStatus.OK,
                message: 'Webhook processed successfully',
            };
        } catch (error) {
            this.logger.error(`Error processing webhook: ${error.message}`, error.stack);

            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                {
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Error processing webhook',
                    error: error.message,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    private async handleApprovedTransaction(existingTransaction: any, serviceTransaction: any) {
        this.logger.log(`Approving transaction: ${serviceTransaction.reference}`);

        // Actualizar transacción
        existingTransaction.approve(serviceTransaction.id, serviceTransaction.status);
        await this.transactionRepository.update(existingTransaction);

        // Actualizar stock
        const productId = existingTransaction['productId'];
        const quantity = existingTransaction['quantity'];
        await this.updateStockUseCase.execute(productId, quantity);

        // Crear delivery si no existe
        const deliveryResult = await this.deliveryRepository.findByTransactionId(
            existingTransaction.getId(),
        );

        if (deliveryResult.isFailure) {
            // Extraer dirección del webhook si está disponible
            const shippingAddress = serviceTransaction.shipping_address || {};
            const address = shippingAddress.address_line_1 || 'Address not provided';
            const city = shippingAddress.city || 'City not provided';
            const region = shippingAddress.region || 'Region not provided';

            const delivery = new Delivery(
                undefined,
                existingTransaction.getId(),
                address,
                city,
                region,
                Delivery.generateTrackingNumber(),
                Delivery.calculateEstimatedDelivery(city),
                new Date(),
                new Date(),
            );

            await this.deliveryRepository.save(delivery);
            this.logger.log(`Delivery created with tracking: ${delivery.getTrackingNumber()}`);
        }
    }

    private async handleDeclinedTransaction(existingTransaction: any, serviceTransaction: any) {
        this.logger.log(`Declining transaction: ${serviceTransaction.reference}`);

        existingTransaction.decline(
            serviceTransaction.id,
            serviceTransaction.status,
            serviceTransaction.status_message,
        );

        await this.transactionRepository.update(existingTransaction);
    }
}