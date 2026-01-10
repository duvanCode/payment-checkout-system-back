export enum CardType {
    VISA = 'VISA',
    MASTERCARD = 'MASTERCARD',
    UNKNOWN = 'UNKNOWN',
}

export class CreditCard {
    private readonly number: string;
    private readonly holderName: string;
    private readonly expirationMonth: string;
    private readonly expirationYear: string;
    private readonly cvv: string;
    private readonly type: CardType;

    private constructor(
        number: string,
        holderName: string,
        expirationMonth: string,
        expirationYear: string,
        cvv: string,
    ) {
        this.number = number.replace(/\s/g, '');
        this.holderName = holderName;
        this.expirationMonth = expirationMonth;
        this.expirationYear = expirationYear;
        this.cvv = cvv;
        this.type = this.detectCardType();
        this.validate();
    }

    static create(
        number: string,
        holderName: string,
        expirationMonth: string,
        expirationYear: string,
        cvv: string,
    ): CreditCard {
        return new CreditCard(number, holderName, expirationMonth, expirationYear, cvv);
    }

    private detectCardType(): CardType {
        const cleanNumber = this.number.replace(/\s/g, '');

        if (/^4/.test(cleanNumber)) {
            return CardType.VISA;
        }

        if (/^5[1-5]/.test(cleanNumber)) {
            return CardType.MASTERCARD;
        }

        return CardType.UNKNOWN;
    }

    private validate(): void {
        // Validar longitud
        if (this.number.length < 13 || this.number.length > 19) {
            throw new Error('Invalid card number length');
        }

        // Validar solo números
        if (!/^\d+$/.test(this.number)) {
            throw new Error('Card number must contain only digits');
        }

        // Validar CVV
        if (!/^\d{3,4}$/.test(this.cvv)) {
            throw new Error('Invalid CVV');
        }

        // Validar mes
        const month = parseInt(this.expirationMonth);
        if (month < 1 || month > 12) {
            throw new Error('Invalid expiration month');
        }

        // Validar año
        const year = parseInt(this.expirationYear);
        const currentYear = new Date().getFullYear() % 100;
        if (year < currentYear) {
            throw new Error('Card is expired');
        }

        // Validar nombre
        if (!this.holderName || this.holderName.trim().length < 3) {
            throw new Error('Invalid card holder name');
        }
    }

    getNumber(): string {
        return this.number;
    }

    getMaskedNumber(): string {
        return `**** **** **** ${this.number.slice(-4)}`;
    }

    getHolderName(): string {
        return this.holderName;
    }

    getExpirationMonth(): string {
        return this.expirationMonth;
    }

    getExpirationYear(): string {
        return this.expirationYear;
    }

    getCvv(): string {
        return this.cvv;
    }

    getType(): CardType {
        return this.type;
    }

    isVisa(): boolean {
        return this.type === CardType.VISA;
    }

    isMastercard(): boolean {
        return this.type === CardType.MASTERCARD;
    }
}