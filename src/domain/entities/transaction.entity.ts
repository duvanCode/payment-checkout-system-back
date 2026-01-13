import { TransactionStatus } from '../enums/transaction-status.enum';
import { Money } from '../value-objects/money.vo';
import { TransactionItem } from './transaction-item.entity';

export class Transaction {
    private id?: string;
    private transactionNumber: string;
    private status: TransactionStatus;
    private customerId: string;
    private subtotal: Money;
    private baseFee: Money;
    private deliveryFee: Money;
    private total: Money;
    private items: TransactionItem[];
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
        customerId: string,
        subtotal: Money,
        baseFee: Money,
        deliveryFee: Money,
        total: Money,
        items: TransactionItem[],
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
        this.customerId = customerId;
        this.subtotal = subtotal;
        this.baseFee = baseFee;
        this.deliveryFee = deliveryFee;
        this.total = total;
        this.items = items;
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

    /**
     * Actualiza la transacción con el estado real de Service
     * @param serviceTransactionId ID de la transacción en Service
     * @param serviceStatus Estado de Service (PENDING, APPROVED, DECLINED, etc.)
     */
    updateFromService(serviceTransactionId: string, serviceStatus: string): void {
        this.serviceTransactionId = serviceTransactionId;
        this.serviceStatus = serviceStatus;
        this.processedAt = new Date();
        this.updatedAt = new Date();

        // Mapear estado de Service a estado interno
        const ServiceStatus = serviceStatus.toUpperCase();
        switch (ServiceStatus) {
            case 'APPROVED':
                this.status = TransactionStatus.APPROVED;
                break;
            case 'DECLINED':
            case 'VOIDED':
                this.status = TransactionStatus.DECLINED;
                break;
            case 'ERROR':
                this.status = TransactionStatus.ERROR;
                break;
            case 'PENDING':
            default:
                this.status = TransactionStatus.PENDING;
                break;
        }
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

    getItems(): TransactionItem[] {
        return this.items;
    }

    toJSON() {
        return {
            id: this.id,
            transactionNumber: this.transactionNumber,
            status: this.status,
            customerId: this.customerId,
            items: this.items.map(item => item.toJSON()),
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
