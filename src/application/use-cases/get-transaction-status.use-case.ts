import { Injectable, Inject } from '@nestjs/common';
import type { TransactionRepositoryPort } from '../ports/transaction.repository.port';
import { TRANSACTION_REPOSITORY } from '../ports/transaction.repository.port';
import type { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { PAYMENT_GATEWAY } from '../ports/payment-gateway.port';
import { Result } from '../../shared/result';

export interface TransactionStatusResponse {
    transactionNumber: string;
    internalStatus: string;
    serviceStatus?: string;
    serviceTransactionId?: string;
    total: number;
    productId: string;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    processedAt?: Date;
    errorMessage?: string;
}

@Injectable()
export class GetTransactionStatusUseCase {
    constructor(
        @Inject(TRANSACTION_REPOSITORY)
        private readonly transactionRepository: TransactionRepositoryPort,
        @Inject(PAYMENT_GATEWAY)
        private readonly paymentGateway: PaymentGatewayPort,
    ) {}

    async execute(transactionNumber: string): Promise<Result<TransactionStatusResponse>> {
        // Buscar la transacción en la base de datos
        const transactionResult = await this.transactionRepository.findByTransactionNumber(
            transactionNumber,
        );

        if (transactionResult.isFailure) {
            return Result.fail('Transaction not found');
        }

        const transaction = transactionResult.getValue();
        const transactionData = transaction.toJSON();

        // Si tiene serviceTransactionId, consultar el estado actual en Wompi
        let latestServiceStatus = transactionData.serviceStatus;
        if (transactionData.serviceTransactionId) {
            const serviceResult = await this.paymentGateway.getTransaction(
                transactionData.serviceTransactionId,
            );

            if (serviceResult.isSuccess) {
                const serviceTransaction = serviceResult.getValue();
                latestServiceStatus = serviceTransaction.status;
            }
        }

        return Result.ok({
            transactionNumber: transactionData.transactionNumber,
            internalStatus: transaction.getStatus(),
            serviceStatus: latestServiceStatus,
            serviceTransactionId: transactionData.serviceTransactionId,
            total: transactionData.total,
            productId: transactionData.productId,
            quantity: transactionData.quantity,
            createdAt: transactionData.createdAt,
            updatedAt: transactionData.updatedAt,
            processedAt: transactionData.processedAt,
            errorMessage: transactionData.errorMessage,
        });
    }
}
