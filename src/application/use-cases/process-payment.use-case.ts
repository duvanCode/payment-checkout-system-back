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
            this.logger.log(`Starting payment process for ${dto.items.length} items`);

            // PASO 1: Calcular summary (valida stock también para todos los items)
            const summaryResult = await this.calculateSummaryUseCase.execute({
                items: dto.items,
                deliveryCity: dto.deliveryCity,
            });

            if (summaryResult.isFailure) {
                return Result.fail(summaryResult.getError());
            }

            const summary = summaryResult.getValue();

            // Nota: El modelo de base de datos actual solo soporta un productId por transacción.
            // Para mantener la funcionalidad sin migrar la base de datos ahora, guardaremos
            // la referencia del primer producto en la transacción, pero el total será el real de todos los items.
            const firstItem = dto.items[0];

            // PASO 2: Crear transacción en estado PENDING con todos los items
            const transactionResult = await this.createTransactionUseCase.execute({
                items: summary.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.productPrice,
                    subtotal: item.subtotal
                })),

                subtotal: summary.subtotal,
                baseFee: summary.fees.base,
                deliveryFee: summary.fees.delivery,

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

            const paymentResult = await this.paymentGateway.processPayment({
                amount: summary.total,
                currency: 'COP',
                reference: transaction.getTransactionNumber(),
                customerEmail: dto.customerEmail,
                cardToken: dto.cardToken,
            });

            if (paymentResult.isSuccess) {
                const paymentResponse = paymentResult.getValue();

                this.logger.log(`Payment sent - Transaction ID: ${paymentResponse.transactionId}, Status: ${paymentResponse.status}`);

                transaction.updateFromService(
                    paymentResponse.transactionId,
                    paymentResponse.status
                );
                await this.transactionRepository.update(transaction);

                // Devolver respuesta con el estado actual
                const result: PaymentResultDto = {
                    success: true,
                    transactionNumber: transaction.getTransactionNumber(),
                    status: transaction.getStatus(),
                    message: this.getMessageForStatus(transaction.getStatus()),
                    product: {
                        id: firstItem.productId,
                        name: summary.items[0].productName + (dto.items.length > 1 ? ` y ${dto.items.length - 1} más` : ''),
                        updatedStock: 0,
                    },
                    createdAt: transaction['createdAt'],
                    processedAt: new Date(),
                };

                return Result.ok(result);

            } else {
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
