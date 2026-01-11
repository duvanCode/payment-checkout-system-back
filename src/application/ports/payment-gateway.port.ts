import { Result } from '../../shared/result';

export interface PaymentRequest {
    amount: number;
    currency: string;
    reference: string;
    customerEmail: string;
    cardToken: string; // Token generado en el frontend usando Service
}

export interface PaymentResponse {
    transactionId: string;
    status: string;
    statusMessage: string;
    reference: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    createdAt: string;
}

export interface PaymentGatewayPort {
    processPayment(request: PaymentRequest): Promise<Result<PaymentResponse>>;
    getTransaction(transactionId: string): Promise<Result<PaymentResponse>>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');