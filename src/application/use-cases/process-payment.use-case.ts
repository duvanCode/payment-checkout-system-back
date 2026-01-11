import { Injectable, Inject, Logger } from '@nestjs/common';
import {
    type TransactionRepositoryPort,
    TRANSACTION_REPOSITORY,
} from '../ports/transaction.repository.port';
import {
    type DeliveryRepositoryPort,
    DELIVERY_REPOSITORY,
} from '../ports/delivery.repository.port';
import {
    type ProductRepositoryPort,
    PRODUCT_REPOSITORY,
} from '../ports/product.repository.port';
import {
    type PaymentGatewayPort,
    PAYMENT_GATEWAY,
} from '../ports/payment-gateway.port';
import { PaymentRequestDto } from '../dtos/payment-request.dto';
import { PaymentResultDto } from '../dtos/payment-result.dto';
import { Result } from '../../shared/result';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import { UpdateStockUseCase } from './update-stock.use-case';
import { CalculateSummaryUseCase } from './calculate-summary.use-case';
import { Delivery } from '../../domain/entities/delivery.entity';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';

@Injectable()
export class ProcessPaymentUseCase {
    private readonly logger = new Logger(ProcessPaymentUseCase.name);

    constructor(
        @Inject(TRANSACTION_REPOSITORY)
        private readonly transactionRepository: TransactionRepositoryPort,
        @Inject(DELIVERY_REPOSITORY)
        private readonly deliveryRepository: DeliveryRepositoryPort,
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: ProductRepositoryPort,
        @Inject(PAYMENT_GATEWAY)
        private readonly paymentGateway: PaymentGatewayPort,
        private readonly calculateSummaryUseCase: CalculateSummaryUseCase,
        private readonly createTransactionUseCase: CreateTransactionUseCase,
        private readonly updateStockUseCase: UpdateStockUseCase,
    ) { }

    async execute(dto: PaymentRequestDto): Promise<Result<PaymentResultDto>> {
        try {
            this.logger.log(`Starting payment process for product: ${dto.productId}`);

            // PASO 1: Calcular summary (valida stock también)
            const summaryResult = await this.calculateSummaryUseCase.execute({
                productId: dto.productId,
                quantity: dto.quantity,
                deliveryCity: dto.deliveryCity,
            });

            if (summaryResult.isFailure) {
                return Result.fail(summaryResult.getError());
            }

            const summary = summaryResult.getValue();

            // PASO 2: Crear transacción en estado PENDING
            const transactionResult = await this.createTransactionUseCase.execute({
                productId: dto.productId,
                quantity: dto.quantity,
                subtotal: summary.subtotal,
                baseFee: summary.baseFee,
                deliveryFee: summary.deliveryFee,
                total: summary.total,
                customerEmail: dto.customerEmail,
                customerPhone: dto.customerPhone,
                customerFullName: dto.customerFullName,
            });

            if (transactionResult.isFailure) {
                return Result.fail(transactionResult.getError());
            }

            const transaction = transactionResult.getValue();
            this.logger.log(`Transaction created: ${transaction.getTransactionNumber()}`);

            // PASO 3: Procesar pago con Service (usando token generado en el frontend)
            const paymentResult = await this.paymentGateway.processPayment({
                amount: summary.total,
                currency: 'COP',
                reference: transaction.getTransactionNumber(),
                customerEmail: dto.customerEmail,
                cardToken: dto.cardToken,
            });

            // PASO 4: Procesar resultado del pago
            if (paymentResult.isSuccess) {
                const paymentResponse = paymentResult.getValue();

                // Actualizar transacción con el estado real de Service
                transaction.updateFromService(
                    paymentResponse.transactionId,
                    paymentResponse.status
                );
                await this.transactionRepository.update(transaction);

                // Procesar según el estado de Service
                const ServiceStatus = paymentResponse.status.toUpperCase();

                if (ServiceStatus === 'APPROVED') {
                    // Solo procesar delivery y stock si está aprobado
                    return await this.handleApprovedPayment(
                        transaction,
                        paymentResponse,
                        dto,
                        summary.productName,
                    );
                } else if (ServiceStatus === 'PENDING') {
                    // Transacción pendiente - esperar confirmación via webhook
                    return await this.handlePendingPayment(
                        transaction,
                        paymentResponse,
                        summary.productName,
                    );
                } else {
                    // Transacción rechazada o error
                    return await this.handleFailedPayment(
                        transaction,
                        paymentResponse.statusMessage || `Transaction ${ServiceStatus}`,
                    );
                }
            } else {
                return await this.handleFailedPayment(
                    transaction,
                    paymentResult.getError(),
                );
            }
        } catch (error) {
            this.logger.error(`Error processing payment: ${error.message}`, error.stack);
            return Result.fail(`Payment processing error: ${error.message}`);
        }
    }

    private async handleApprovedPayment(
        transaction: any,
        paymentResponse: any,
        dto: PaymentRequestDto,
        productName: string,
    ): Promise<Result<PaymentResultDto>> {
        this.logger.log(`Payment APPROVED: ${paymentResponse.transactionId}`);

        // Actualizar stock (solo si está aprobado)
        await this.updateStockUseCase.execute(dto.productId, dto.quantity);

        // Crear delivery
        const delivery = new Delivery(
            undefined,
            transaction.getId(),
            dto.deliveryAddress,
            dto.deliveryCity,
            dto.deliveryDepartment,
            Delivery.generateTrackingNumber(),
            Delivery.calculateEstimatedDelivery(dto.deliveryCity),
            new Date(),
            new Date(),
        );

        await this.deliveryRepository.save(delivery);

        // Obtener stock actualizado
        const productResult = await this.productRepository.findById(dto.productId);
        const updatedStock = productResult.isSuccess
            ? productResult.getValue().getStock()
            : 0;

        const result: PaymentResultDto = {
            success: true,
            transactionNumber: transaction.getTransactionNumber(),
            status: TransactionStatus.APPROVED,
            message: 'Payment processed successfully',
            delivery: {
                trackingNumber: delivery.getTrackingNumber(),
                estimatedDeliveryDate: delivery.getEstimatedDeliveryDate(),
                address: dto.deliveryAddress,
                city: dto.deliveryCity,
            },
            product: {
                id: dto.productId,
                name: productName,
                updatedStock,
            },
            createdAt: transaction['createdAt'],
            processedAt: new Date(),
        };

        return Result.ok(result);
    }

    private async handlePendingPayment(
        transaction: any,
        paymentResponse: any,
        productName: string,
    ): Promise<Result<PaymentResultDto>> {
        this.logger.log(`Payment PENDING: ${paymentResponse.transactionId} - Awaiting confirmation`);

        // NO actualizar stock ni crear delivery hasta que se confirme
        // La confirmación llegará via webhook de Service

        const result: PaymentResultDto = {
            success: true,
            transactionNumber: transaction.getTransactionNumber(),
            status: TransactionStatus.PENDING,
            message: 'Payment is being processed. You will receive a confirmation soon.',
            product: {
                id: transaction['productId'],
                name: productName,
                updatedStock: 0, // No actualizar stock aún
            },
            createdAt: transaction['createdAt'],
            processedAt: new Date(),
        };

        return Result.ok(result);
    }

    private async handleFailedPayment(
        transaction: any,
        error: string,
    ): Promise<Result<PaymentResultDto>> {
        this.logger.warn(`Payment declined: ${error}`);

        // Ya no necesitamos llamar a decline() porque updateFromService() ya actualizó el estado
        // transaction.decline('N/A', 'DECLINED', error);
        // await this.transactionRepository.update(transaction);

        const result: PaymentResultDto = {
            success: false,
            transactionNumber: transaction.getTransactionNumber(),
            status: TransactionStatus.DECLINED,
            message: 'Payment was declined',
            error: {
                code: 'PAYMENT_DECLINED',
                message: error,
            },
            createdAt: transaction['createdAt'],
            processedAt: new Date(),
        };

        return Result.ok(result);
    }
}