import { Injectable } from '@nestjs/common';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionItem } from '../../domain/entities/transaction-item.entity';
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
                include: { items: true },
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
                include: { items: true },
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
                    customerId: transaction['customerId'],
                    subtotal: transaction['subtotal'].getAmount(),
                    baseFee: transaction['baseFee'].getAmount(),
                    deliveryFee: transaction['deliveryFee'].getAmount(),
                    total: transaction.getTotal().getAmount(),
                    items: {
                        create: transaction.getItems().map(item => ({
                            productId: item.getProductId(),
                            productName: item.getProductName(),
                            quantity: item.getQuantity(),
                            price: item.getPrice().getAmount(),
                            subtotal: item.getSubtotal().getAmount(),
                        })),

                    },
                },
                include: { items: true },
            });

            return Result.ok(this.toDomain(created));
        } catch (error) {
            return Result.fail(`Error saving transaction: ${error.message}`);
        }
    }


    async findPendingTransactions(): Promise<Result<Transaction[]>> {
        try {
            const transactions = await this.prisma.transaction.findMany({
                where: {
                    status: TransactionStatus.PENDING,
                    serviceTransactionId: {
                        not: null,
                    },
                },
                orderBy: {
                    createdAt: 'asc',
                },
                include: { items: true },
            });

            const domainTransactions = transactions.map(t => this.toDomain(t));
            return Result.ok(domainTransactions);
        } catch (error) {
            return Result.fail(`Error finding pending transactions: ${error.message}`);
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
                include: { items: true },
            });

            return Result.ok(this.toDomain(updated));
        } catch (error) {
            return Result.fail(`Error updating transaction: ${error.message}`);
        }
    }

    private toDomain(raw: any): Transaction {
        const items = (raw.items || []).map(
            (item: any) =>
                new TransactionItem(
                    item.id,
                    item.transactionId,
                    item.productId,
                    item.productName,
                    item.quantity,
                    Money.from(Number(item.price), 'COP'),
                    Money.from(Number(item.subtotal), 'COP'),
                    item.createdAt,
                ),
        );

        return new Transaction(
            raw.id,
            raw.transactionNumber,
            raw.status as TransactionStatus,
            raw.customerId,
            Money.from(Number(raw.subtotal)),
            Money.from(Number(raw.baseFee)),
            Money.from(Number(raw.deliveryFee)),
            Money.from(Number(raw.total)),
            items,
            raw.createdAt,
            raw.updatedAt,
            raw.serviceTransactionId,
            raw.serviceStatus,
            raw.errorMessage,
            raw.processedAt,
        );
    }
}