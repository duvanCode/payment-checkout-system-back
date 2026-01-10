import { Transaction } from '../../domain/entities/transaction.entity';
import { Result } from '../../shared/result';

export interface TransactionRepositoryPort {
    findById(id: string): Promise<Result<Transaction>>;
    findByTransactionNumber(transactionNumber: string): Promise<Result<Transaction>>;
    save(transaction: Transaction): Promise<Result<Transaction>>;
    update(transaction: Transaction): Promise<Result<Transaction>>;
}

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');