export class Customer {
    private id?: string;
    private email: string;
    private phone: string;
    private fullName: string;
    private createdAt: Date;
    private updatedAt: Date;

    constructor(
        id: string | undefined,
        email: string,
        phone: string,
        fullName: string,
        createdAt: Date,
        updatedAt: Date,
    ) {
        this.id = id;
        this.email = email;
        this.phone = phone;
        this.fullName = fullName;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.validate();
    }

    private validate(): void {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.email)) {
            throw new Error('Invalid email format');
        }

        if (!this.phone || this.phone.length < 7) {
            throw new Error('Invalid phone number');
        }

        if (!this.fullName || this.fullName.trim().length < 3) {
            throw new Error('Invalid full name');
        }
    }

    getId(): string | undefined {
        return this.id;
    }

    getEmail(): string {
        return this.email;
    }

    getPhone(): string {
        return this.phone;
    }

    getFullName(): string {
        return this.fullName;
    }

    toJSON() {
        return {
            id: this.id,
            email: this.email,
            phone: this.phone,
            fullName: this.fullName,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}