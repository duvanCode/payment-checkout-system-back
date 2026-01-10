import { Injectable } from '@nestjs/common';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { Money } from '../../domain/value-objects/money.vo';
import { Result } from '../../shared/result';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaTransactionRepository implements TransactionRepositoryPort {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string): Promise<Result<Transaction>> {
        try {
            const transaction = await this.prisma.transaction.findUnique({
                where: { id },
            });

            if (!transaction) {
                return Result.fail('Transaction not found');
            }

            return Result.ok(this.toDomain(transaction));
        } catch (error) {
            return Result.fail(`Error finding transaction: ${error.message}`);
        }
    }

    async findByTransactionNumber(transactionNumber: string): Promise<Result<Transaction>> {
        try {
            const transaction = await this.prisma.transaction.findUnique({
                where: { transactionNumber },
            });

            if (!transaction) {
                return Result.fail('Transaction not found');
            }

            return Result.ok(this.toDomain(transaction));
        } catch (error) {
            return Result.fail(`Error finding transaction: ${error.message}`);
        }
    }

    async save(transaction: Transaction): Promise<Result<Transaction>> {
        try {
            const created = await this.prisma.transaction.create({
                data: {
                    transactionNumber: transaction.getTransactionNumber(),
                    status: transaction.getStatus(),
                    productId: transaction['productId'],
                    customerId: transaction['customerId'],
                    quantity: transaction['quantity'],
                    subtotal: transaction['subtotal'].getAmount(),
                    baseFee: transaction['baseFee'].getAmount(),
                    deliveryFee: transaction['deliveryFee'].getAmount(),
                    total: transaction.getTotal().getAmount(),
                },
            });

            return Result.ok(this.toDomain(created));
        } catch (error) {
            return Result.fail(`Error saving transaction: ${error.message}`);
        }
    }

    async update(transaction: Transaction): Promise<Result<Transaction>> {
        try {
            const data = transaction.toJSON();

            const updated = await this.prisma.transaction.update({
                where: { id: transaction.getId() },
                data: {
                    status: data.status,
                    serviceTransactionId: data.serviceTransactionId,
                    serviceStatus: data.serviceStatus,
                    errorMessage: data.errorMessage,
                    processedAt: data.processedAt,
                    updatedAt: new Date(),
                },
            });

            return Result.ok(this.toDomain(updated));
        } catch (error) {
            return Result.fail(`Error updating transaction: ${error.message}`);
        }
    }

    private toDomain(raw: any): Transaction {
        return new Transaction(
            raw.id,
            raw.transactionNumber,
            raw.status as TransactionStatus,
            raw.productId,
            raw.customerId,
            raw.quantity,
            Money.from(Number(raw.subtotal)),
            Money.from(Number(raw.baseFee)),
            Money.from(Number(raw.deliveryFee)),
            Money.from(Number(raw.total)),
            raw.createdAt,
            raw.updatedAt,
            raw.serviceTransactionId,
            raw.serviceStatus,
            raw.errorMessage,
            raw.processedAt,
        );
    }
}