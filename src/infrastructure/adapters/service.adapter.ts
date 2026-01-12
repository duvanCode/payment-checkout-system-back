import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as crypto from 'crypto';
import {
    PaymentGatewayPort,
    PaymentRequest,
    PaymentResponse,
} from '../../application/ports/payment-gateway.port';
import { Result } from '../../shared/result';

@Injectable()
export class ServiceAdapter implements PaymentGatewayPort {
    private readonly httpClient: AxiosInstance;
    private readonly publicKey: string;
    private readonly privateKey: string;
    private readonly integritySecret: string;
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('service.baseUrl') as string;
        this.publicKey = this.configService.get<string>('service.publicKey') as string;
        this.privateKey = this.configService.get<string>('service.privateKey') as string;
        this.integritySecret = this.configService.get<string>('service.integritySecret') as string;

        this.httpClient = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Configurar interceptores
        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        // Interceptor de Request - FIXED TYPE
        this.httpClient.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                const requestId = this.generateRequestId();
                config.headers['X-Request-ID'] = requestId;
                return config;
            },
            (error: AxiosError) => {
                return Promise.reject(error);
            }
        );

        // Interceptor de Response
        this.httpClient.interceptors.response.use(
            (response: AxiosResponse) => {
                return response;
            },
            (error: AxiosError) => {
                return Promise.reject(error);
            }
        );
    }

    private generateRequestId(): string {
        return `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateIntegritySignature(reference: string, amountInCents: number, currency: string): string {
        // La firma de integridad se calcula como: reference + amountInCents + currency + integritySecret
        const data = `${reference}${amountInCents}${currency}${this.integritySecret}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    async processPayment(request: PaymentRequest): Promise<Result<PaymentResponse>> {
        try {
            // PASO 1: Obtener token de aceptación
            const acceptanceTokenResult = await this.getAcceptanceToken();
            if (acceptanceTokenResult.isFailure) {
                return Result.fail(acceptanceTokenResult.getError());
            }
            const acceptanceToken = acceptanceTokenResult.getValue();

            // PASO 2: Crear transacción
            const transactionResult = await this.createTransaction({
                ...request,
                acceptanceToken,
            });

            if (transactionResult.isFailure) {
                return Result.fail(transactionResult.getError());
            }

            return transactionResult;
        } catch (error) {
            return Result.fail(`Payment processing failed: ${error.message}`);
        }
    }

    async getTransaction(transactionId: string): Promise<Result<PaymentResponse>> {
        try {
            const response = await this.httpClient.get(`/transactions/${transactionId}`, {
                headers: {
                    Authorization: `Bearer ${this.privateKey}`,
                },
            });

            const transaction = response.data.data;

            return Result.ok({
                transactionId: transaction.id,
                status: transaction.status,
                statusMessage: transaction.status_message || '',
                reference: transaction.reference,
                amount: transaction.amount_in_cents / 100,
                currency: transaction.currency,
                paymentMethod: transaction.payment_method_type,
                createdAt: transaction.created_at,
            });
        } catch (error) {
            return Result.fail(`Failed to fetch transaction: ${error.message}`);
        }
    }

    private async getAcceptanceToken(): Promise<Result<string>> {
        try {
            const response = await this.httpClient.get('/merchants/' + this.publicKey);

            if (response.data.data?.presigned_acceptance) {
                return Result.ok(response.data.data.presigned_acceptance.acceptance_token);
            }

            return Result.fail('Failed to get acceptance token');
        } catch (error) {
            return Result.fail(`Failed to get acceptance token: ${error.message}`);
        }
    }

    private async createTransaction(data: {
        amount: number;
        currency: string;
        reference: string;
        customerEmail: string;
        cardToken: string;
        acceptanceToken: string;
    }): Promise<Result<PaymentResponse>> {
        try {
            const amountInCents = Math.round(data.amount * 100);
            const signature = this.generateIntegritySignature(data.reference, amountInCents, data.currency);

            const response = await this.httpClient.post(
                '/transactions',
                {
                    acceptance_token: data.acceptanceToken,
                    amount_in_cents: amountInCents,
                    currency: data.currency,
                    customer_email: data.customerEmail,
                    reference: data.reference,
                    signature: signature,
                    payment_method: {
                        type: 'CARD',
                        token: data.cardToken,
                        installments: 1,
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.privateKey}`,
                    },
                },
            );

            const transaction = response.data.data;

            return Result.ok({
                transactionId: transaction.id,
                status: transaction.status,
                statusMessage: transaction.status_message || '',
                reference: transaction.reference,
                amount: transaction.amount_in_cents / 100,
                currency: transaction.currency,
                paymentMethod: transaction.payment_method_type,
                createdAt: transaction.created_at,
            });
        } catch (error) {
            if (error.response?.data?.error) {
                const serviceError = error.response.data.error;
                let errorMessage = serviceError.type;

                // messages es un objeto con arrays de mensajes por campo
                if (serviceError.messages) {
                    const allMessages = Object.entries(serviceError.messages)
                        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                        .join('; ');
                    errorMessage = `${errorMessage} - ${allMessages}`;
                }

                return Result.fail(`service error: ${errorMessage}`);
            }

            return Result.fail(`Failed to create transaction: ${error.message}`);
        }
    }
}