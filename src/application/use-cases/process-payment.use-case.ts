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
import { CreditCard } from '../../domain/value-objects/credit-card.vo';
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

            // PASO 1: Validar tarjeta de crédito
            const cardValidation = this.validateCreditCard(dto);
            if (cardValidation.isFailure) {
                return Result.fail(cardValidation.getError());
            }

            // PASO 2: Calcular summary (valida stock también)
            const summaryResult = await this.calculateSummaryUseCase.execute({
                productId: dto.productId,
                quantity: dto.quantity,
                deliveryCity: dto.deliveryCity,
            });

            if (summaryResult.isFailure) {
                return Result.fail(summaryResult.getError());
            }

            const summary = summaryResult.getValue();

            // PASO 3: Crear transacción en estado PENDING
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

            // PASO 4: Procesar pago con Wompi
            const paymentResult = await this.paymentGateway.processPayment({
                amount: summary.total,
                currency: 'COP',
                reference: transaction.getTransactionNumber(),
                customerEmail: dto.customerEmail,
                cardNumber: dto.cardNumber,
                cardHolderName: dto.cardHolderName,
                expirationMonth: dto.expirationMonth,
                expirationYear: dto.expirationYear,
                cvv: dto.cvv,
            });

            // PASO 5: Procesar resultado del pago
            if (paymentResult.isSuccess) {
                return await this.handleSuccessfulPayment(
                    transaction,
                    paymentResult.getValue(),
                    dto,
                    summary.productName,
                );
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

    private validateCreditCard(dto: PaymentRequestDto): Result<CreditCard> {
        try {
            const card = CreditCard.create(
                dto.cardNumber,
                dto.cardHolderName,
                dto.expirationMonth,
                dto.expirationYear,
                dto.cvv,
            );

            if (card.getType() === 'UNKNOWN') {
                return Result.fail('Only VISA and MasterCard are accepted');
            }

            return Result.ok(card);
        } catch (error) {
            return Result.fail(`Invalid credit card: ${error.message}`);
        }
    }

    private async handleSuccessfulPayment(
        transaction: any,
        paymentResponse: any,
        dto: PaymentRequestDto,
        productName: string,
    ): Promise<Result<PaymentResultDto>> {
        this.logger.log(`Payment approved: ${paymentResponse.transactionId}`);

        // Actualizar transacción a APPROVED
        transaction.approve(paymentResponse.transactionId, paymentResponse.status);
        await this.transactionRepository.update(transaction);

        // Actualizar stock
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

    private async handleFailedPayment(
        transaction: any,
        error: string,
    ): Promise<Result<PaymentResultDto>> {
        this.logger.warn(`Payment declined: ${error}`);

        // Actualizar transacción a DECLINED
        transaction.decline('N/A', 'DECLINED', error);
        await this.transactionRepository.update(transaction);

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