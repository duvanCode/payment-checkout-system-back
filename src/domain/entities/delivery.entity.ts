export class Delivery {
    private id?: string;
    private transactionId: string;
    private address: string;
    private city: string;
    private department: string;
    private trackingNumber: string;
    private estimatedDeliveryDate: Date;
    private createdAt: Date;
    private updatedAt: Date;

    constructor(
        id: string | undefined,
        transactionId: string,
        address: string,
        city: string,
        department: string,
        trackingNumber: string,
        estimatedDeliveryDate: Date,
        createdAt: Date,
        updatedAt: Date,
    ) {
        this.id = id;
        this.transactionId = transactionId;
        this.address = address;
        this.city = city;
        this.department = department;
        this.trackingNumber = trackingNumber;
        this.estimatedDeliveryDate = estimatedDeliveryDate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static generateTrackingNumber(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `TRACK-${timestamp}-${random}`;
    }

    static calculateEstimatedDelivery(city: string): Date {
        const daysToAdd = city.toLowerCase() === 'bogotá' ? 3 : 7;
        const estimatedDate = new Date();
        estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);
        return estimatedDate;
    }

    getId(): string | undefined {
        return this.id;
    }

    getTrackingNumber(): string {
        return this.trackingNumber;
    }

    getEstimatedDeliveryDate(): Date {
        return this.estimatedDeliveryDate;
    }

    toJSON() {
        return {
            id: this.id,
            transactionId: this.transactionId,
            address: this.address,
            city: this.city,
            department: this.department,
            trackingNumber: this.trackingNumber,
            estimatedDeliveryDate: this.estimatedDeliveryDate,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}