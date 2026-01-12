import { Injectable, Inject, Logger } from '@nestjs/common';
import {
    type TransactionRepositoryPort,
    TRANSACTION_REPOSITORY,
} from '../ports/transaction.repository.port';
import {
    type PaymentGatewayPort,
    PAYMENT_GATEWAY,
} from '../ports/payment-gateway.port';
import { PaymentRequestDto } from '../dtos/payment-request.dto';
import { PaymentResultDto } from '../dtos/payment-result.dto';
import { Result } from '../../shared/result';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import { CalculateSummaryUseCase } from './calculate-summary.use-case';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';

@Injectable()
export class ProcessPaymentUseCase {
    private readonly logger = new Logger(ProcessPaymentUseCase.name);

    constructor(
        @Inject(TRANSACTION_REPOSITORY)
        private readonly transactionRepository: TransactionRepositoryPort,
        @Inject(PAYMENT_GATEWAY)
        private readonly paymentGateway: PaymentGatewayPort,
        private readonly calculateSummaryUseCase: CalculateSummaryUseCase,
        private readonly createTransactionUseCase: CreateTransactionUseCase,
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

            // PASO 3: Enviar pago a Wompi (usando token generado en el frontend)
            const paymentResult = await this.paymentGateway.processPayment({
                amount: summary.total,
                currency: 'COP',
                reference: transaction.getTransactionNumber(),
                customerEmail: dto.customerEmail,
                cardToken: dto.cardToken,
            });

            // PASO 4: Actualizar transacción con ID de Wompi y devolver respuesta
            if (paymentResult.isSuccess) {
                const paymentResponse = paymentResult.getValue();

                this.logger.log(`Payment sent to Wompi - Transaction ID: ${paymentResponse.transactionId}, Status: ${paymentResponse.status}`);

                // Actualizar transacción con el ID y estado de Wompi
                transaction.updateFromService(
                    paymentResponse.transactionId,
                    paymentResponse.status
                );
                await this.transactionRepository.update(transaction);

                // Devolver respuesta con el estado actual
                // El job se encargará de sincronizar y procesar stock/delivery
                const result: PaymentResultDto = {
                    success: true,
                    transactionNumber: transaction.getTransactionNumber(),
                    status: transaction.getStatus(),
                    message: this.getMessageForStatus(transaction.getStatus()),
                    product: {
                        id: transaction['productId'],
                        name: summary.productName,
                        updatedStock: 0, // El stock se actualizará cuando el job procese la transacción aprobada
                    },
                    createdAt: transaction['createdAt'],
                    processedAt: new Date(),
                };

                return Result.ok(result);
            } else {
                // Error al comunicarse con Wompi
                this.logger.error(`Payment gateway error: ${paymentResult.getError()}`);

                const result: PaymentResultDto = {
                    success: false,
                    transactionNumber: transaction.getTransactionNumber(),
                    status: TransactionStatus.ERROR,
                    message: 'Payment processing failed',
                    error: {
                        code: 'PAYMENT_GATEWAY_ERROR',
                        message: paymentResult.getError(),
                    },
                    createdAt: transaction['createdAt'],
                    processedAt: new Date(),
                };

                return Result.ok(result);
            }
        } catch (error) {
            this.logger.error(`Error processing payment: ${error.message}`, error.stack);
            return Result.fail(`Payment processing error: ${error.message}`);
        }
    }

    private getMessageForStatus(status: TransactionStatus): string {
        switch (status) {
            case TransactionStatus.PENDING:
                return 'Payment is being processed. You will receive a confirmation soon.';
            case TransactionStatus.APPROVED:
                return 'Payment approved. Processing your order.';
            case TransactionStatus.DECLINED:
                return 'Payment was declined.';
            case TransactionStatus.ERROR:
                return 'Payment processing failed.';
            default:
                return 'Payment status unknown.';
        }
    }
}
