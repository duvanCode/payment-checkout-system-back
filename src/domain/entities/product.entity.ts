import { Money } from '../value-objects/money.vo';

export class Product {
    private id: string;
    private name: string;
    private description: string;
    private price: Money;
    private stock: number;
    private imageUrl: string;
    private createdAt: Date;
    private updatedAt: Date;

    constructor(
        id: string,
        name: string,
        description: string,
        price: Money,
        stock: number,
        imageUrl: string,
        createdAt: Date,
        updatedAt: Date,
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
        this.stock = stock;
        this.imageUrl = imageUrl;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getDescription(): string {
        return this.description;
    }

    getPrice(): Money {
        return this.price;
    }

    getStock(): number {
        return this.stock;
    }

    getImageUrl(): string {
        return this.imageUrl;
    }

    hasStock(quantity: number): boolean {
        return this.stock >= quantity;
    }

    reduceStock(quantity: number): void {
        if (!this.hasStock(quantity)) {
            throw new Error(`Insufficient stock. Available: ${this.stock}, Requested: ${quantity}`);
        }
        this.stock -= quantity;
        this.updatedAt = new Date();
    }

    increaseStock(quantity: number): void {
        this.stock += quantity;
        this.updatedAt = new Date();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            price: this.price.getAmount(),
            stock: this.stock,
            imageUrl: this.imageUrl,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}