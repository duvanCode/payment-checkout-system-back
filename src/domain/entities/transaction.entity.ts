import { TransactionStatus } from '../enums/transaction-status.enum';
import { Money } from '../value-objects/money.vo';

export class Transaction {
    private id?: string;
    private transactionNumber: string;
    private status: TransactionStatus;
    private productId: string;
    private customerId: string;
    private quantity: number;
    private subtotal: Money;
    private baseFee: Money;
    private deliveryFee: Money;
    private total: Money;
    private serviceTransactionId?: string;
    private serviceStatus?: string;
    private errorMessage?: string;
    private createdAt: Date;
    private updatedAt: Date;
    private processedAt?: Date;

    constructor(
        id: string | undefined,
        transactionNumber: string,
        status: TransactionStatus,
        productId: string,
        customerId: string,
        quantity: number,
        subtotal: Money,
        baseFee: Money,
        deliveryFee: Money,
        total: Money,
        createdAt: Date,
        updatedAt: Date,
        serviceTransactionId?: string,
        serviceStatus?: string,
        errorMessage?: string,
        processedAt?: Date,
    ) {
        this.id = id;
        this.transactionNumber = transactionNumber;
        this.status = status;
        this.productId = productId;
        this.customerId = customerId;
        this.quantity = quantity;
        this.subtotal = subtotal;
        this.baseFee = baseFee;
        this.deliveryFee = deliveryFee;
        this.total = total;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.serviceTransactionId = serviceTransactionId;
        this.serviceStatus = serviceStatus;
        this.errorMessage = errorMessage;
        this.processedAt = processedAt;
    }

    static generateTransactionNumber(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `TRX-${timestamp}-${random}`;
    }

    getId(): string | undefined {
        return this.id;
    }

    getTransactionNumber(): string {
        return this.transactionNumber;
    }

    getStatus(): TransactionStatus {
        return this.status;
    }

    getTotal(): Money {
        return this.total;
    }

    isPending(): boolean {
        return this.status === TransactionStatus.PENDING;
    }

    isApproved(): boolean {
        return this.status === TransactionStatus.APPROVED;
    }

    approve(serviceTransactionId: string, serviceStatus: string): void {
        this.status = TransactionStatus.APPROVED;
        this.serviceTransactionId = serviceTransactionId;
        this.serviceStatus = serviceStatus;
        this.processedAt = new Date();
        this.updatedAt = new Date();
    }

    decline(serviceTransactionId: string, serviceStatus: string, errorMessage?: string): void {
        this.status = TransactionStatus.DECLINED;
        this.serviceTransactionId = serviceTransactionId;
        this.serviceStatus = serviceStatus;
        this.errorMessage = errorMessage;
        this.processedAt = new Date();
        this.updatedAt = new Date();
    }

    setError(errorMessage: string): void {
        this.status = TransactionStatus.ERROR;
        this.errorMessage = errorMessage;
        this.processedAt = new Date();
        this.updatedAt = new Date();
    }

    toJSON() {
        return {
            id: this.id,
            transactionNumber: this.transactionNumber,
            status: this.status,
            productId: this.productId,
            customerId: this.customerId,
            quantity: this.quantity,
            subtotal: this.subtotal.getAmount(),
            baseFee: this.baseFee.getAmount(),
            deliveryFee: this.deliveryFee.getAmount(),
            total: this.total.getAmount(),
            serviceTransactionId: this.serviceTransactionId,
            serviceStatus: this.serviceStatus,
            errorMessage: this.errorMessage,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            processedAt: this.processedAt,
        };
    }
}