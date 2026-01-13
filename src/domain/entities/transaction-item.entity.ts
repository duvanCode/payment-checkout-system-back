import { Money } from '../value-objects/money.vo';

export class TransactionItem {
    private id?: string;
    private transactionId?: string;
    private productId: string;
    private productName: string;
    private quantity: number;
    private price: Money;
    private subtotal: Money;
    private createdAt: Date;

    constructor(
        id: string | undefined,
        transactionId: string | undefined,
        productId: string,
        productName: string,
        quantity: number,
        price: Money,
        subtotal: Money,
        createdAt: Date,
    ) {
        this.id = id;
        this.transactionId = transactionId;
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.price = price;
        this.subtotal = subtotal;
        this.createdAt = createdAt;
    }


    getId(): string | undefined {
        return this.id;
    }

    getTransactionId(): string | undefined {
        return this.transactionId;
    }

    getProductId(): string {
        return this.productId;
    }

    getProductName(): string {
        return this.productName;
    }

    getQuantity(): number {
        return this.quantity;
    }

    getPrice(): Money {
        return this.price;
    }

    getSubtotal(): Money {
        return this.subtotal;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    toJSON() {
        return {
            id: this.id,
            transactionId: this.transactionId,
            productId: this.productId,
            productName: this.productName,
            quantity: this.quantity,
            price: this.price.getAmount(),
            subtotal: this.subtotal.getAmount(),
            createdAt: this.createdAt,
        };
    }
}
