import { Injectable, Inject } from '@nestjs/common';
import {
    type TransactionRepositoryPort,
    TRANSACTION_REPOSITORY
} from '../ports/transaction.repository.port';
import {
    type CustomerRepositoryPort,
    CUSTOMER_REPOSITORY,
} from '../ports/customer.repository.port';
import { Transaction } from '../../domain/entities/transaction.entity';
import { Customer } from '../../domain/entities/customer.entity';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { Money } from '../../domain/value-objects/money.vo';
import { Result } from '../../shared/result';
import { TransactionItem } from '../../domain/entities/transaction-item.entity';


interface CreateTransactionItemInput {
    productId: string;
    productName?: string;
    quantity: number;
    price: number;
    subtotal: number;
}

interface CreateTransactionInput {
    items: CreateTransactionItemInput[];
    subtotal: number;
    baseFee: number;
    deliveryFee: number;
    total: number;
    customerEmail: string;
    customerPhone: string;
    customerFullName: string;
}


@Injectable()
export class CreateTransactionUseCase {
    constructor(
        @Inject(TRANSACTION_REPOSITORY)
        private readonly transactionRepository: TransactionRepositoryPort,
        @Inject(CUSTOMER_REPOSITORY)
        private readonly customerRepository: CustomerRepositoryPort,
    ) { }

    async execute(input: CreateTransactionInput): Promise<Result<Transaction>> {
        // Buscar o crear cliente
        const customerResult = await this.getOrCreateCustomer(
            input.customerEmail,
            input.customerPhone,
            input.customerFullName,
        );

        if (customerResult.isFailure) {
            return Result.fail(customerResult.getError());
        }

        const customer = customerResult.getValue();

        // Crear ítems de la transacción
        const transactionItems = input.items.map(item => new TransactionItem(
            undefined,
            undefined,
            item.productId,
            item.productName || 'Product',
            item.quantity,
            Money.from(item.price),
            Money.from(item.subtotal),
            new Date()
        ));

        // Crear transacción
        const transaction = new Transaction(
            undefined, // ID se genera en DB
            Transaction.generateTransactionNumber(),
            TransactionStatus.PENDING,
            customer.getId()!,
            Money.from(input.subtotal),
            Money.from(input.baseFee),
            Money.from(input.deliveryFee),
            Money.from(input.total),
            transactionItems,
            new Date(),
            new Date(),
        );


        // Guardar en DB
        const savedResult = await this.transactionRepository.save(transaction);
        if (savedResult.isFailure) {
            return Result.fail(`Failed to create transaction: ${savedResult.getError()}`);
        }

        return savedResult;
    }

    private async getOrCreateCustomer(
        email: string,
        phone: string,
        fullName: string,
    ): Promise<Result<Customer>> {
        // Intentar buscar cliente existente
        const existingCustomer = await this.customerRepository.findByEmail(email);

        if (existingCustomer.isSuccess) {
            return existingCustomer;
        }

        // Si no existe, crear nuevo
        const newCustomer = new Customer(
            undefined, // ID se genera en DB
            email,
            phone,
            fullName,
            new Date(),
            new Date(),
        );

        return await this.customerRepository.save(newCustomer);
    }
}