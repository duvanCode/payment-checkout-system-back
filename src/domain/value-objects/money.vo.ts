export class Money {
    private readonly amount: number;
    private readonly currency: string;

    private constructor(amount: number, currency: string = 'COP') {
        if (amount < 0) {
            throw new Error('Money amount cannot be negative');
        }
        this.amount = amount;
        this.currency = currency;
    }

    static from(amount: number, currency: string = 'COP'): Money {
        return new Money(amount, currency);
    }

    getAmount(): number {
        return this.amount;
    }

    getCurrency(): string {
        return this.currency;
    }

    add(other: Money): Money {
        if (this.currency !== other.currency) {
            throw new Error('Cannot add money with different currencies');
        }
        return Money.from(this.amount + other.amount, this.currency);
    }

    multiply(factor: number): Money {
        return Money.from(this.amount * factor, this.currency);
    }

    toJSON() {
        return {
            amount: this.amount,
            currency: this.currency,
        };
    }
}