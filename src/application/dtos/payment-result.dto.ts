export class PaymentResultDto {
    success: boolean;
    transactionNumber: string;
    status: string;
    message: string;

    // Si es exitoso
    delivery?: {
        trackingNumber: string;
        estimatedDeliveryDate: Date;
        address: string;
        city: string;
    };

    // Si falla
    error?: {
        code: string;
        message: string;
        details?: any;
    };

    // Información del producto actualizado
    product?: {
        id: string;
        name: string;
        updatedStock: number;
    };

    createdAt: Date;
    processedAt?: Date;
}