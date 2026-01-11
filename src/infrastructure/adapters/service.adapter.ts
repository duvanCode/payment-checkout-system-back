import { Injectable, Logger } from '@nestjs/common';
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
    private readonly logger = new Logger(ServiceAdapter.name);
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

        this.logger.log('Service adapter initialized');
    }

    private setupInterceptors(): void {
        // Interceptor de Request - FIXED TYPE
        this.httpClient.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                const requestId = this.generateRequestId();
                
                // Añadir ID de request para tracking
                config.headers['X-Request-ID'] = requestId;

                // Log de la petición
                this.logger.log('═══════════════════════════════════════════════════');
                this.logger.log(`🚀 HTTP REQUEST [${requestId}]`);
                this.logger.log('═══════════════════════════════════════════════════');
                this.logger.log(`📍 Method: ${config.method?.toUpperCase()}`);
                this.logger.log(`🔗 URL: ${config.baseURL}${config.url}`);
                
                if (config.headers) {
                    // Ocultar información sensible en headers
                    const sanitizedHeaders = this.sanitizeHeaders(config.headers);
                    this.logger.log(`📋 Headers: ${JSON.stringify(sanitizedHeaders, null, 2)}`);
                }
                
                if (config.params) {
                    this.logger.log(`🔍 Query Params: ${JSON.stringify(config.params, null, 2)}`);
                }
                
                if (config.data) {
                    // Ocultar información sensible en el payload
                    const sanitizedData = this.sanitizePayload(config.data);
                    this.logger.log(`📦 Payload: ${JSON.stringify(sanitizedData, null, 2)}`);
                }
                
                this.logger.log(`⏰ Timestamp: ${new Date().toISOString()}`);
                this.logger.log('═══════════════════════════════════════════════════\n');

                return config;
            },
            (error: AxiosError) => {
                this.logger.error('❌ REQUEST ERROR');
                this.logger.error(`Error: ${error.message}`);
                return Promise.reject(error);
            }
        );

        // Interceptor de Response
        this.httpClient.interceptors.response.use(
            (response: AxiosResponse) => {
                const requestId = response.config.headers?.['X-Request-ID'] || 'unknown';
                
                this.logger.log('═══════════════════════════════════════════════════');
                this.logger.log(`✅ HTTP RESPONSE [${requestId}]`);
                this.logger.log('═══════════════════════════════════════════════════');
                this.logger.log(`📍 Method: ${response.config.method?.toUpperCase()}`);
                this.logger.log(`🔗 URL: ${response.config.baseURL}${response.config.url}`);
                this.logger.log(`📊 Status: ${response.status} ${response.statusText}`);
                
                if (response.headers) {
                    this.logger.log(`📋 Response Headers: ${JSON.stringify(response.headers, null, 2)}`);
                }
                
                if (response.data) {
                    const sanitizedData = this.sanitizePayload(response.data);
                    this.logger.log(`📥 Response Data: ${JSON.stringify(sanitizedData, null, 2)}`);
                }
                
                const duration = this.calculateDuration(response);
                this.logger.log(`⏱️  Duration: ${duration}ms`);
                this.logger.log(`⏰ Timestamp: ${new Date().toISOString()}`);
                this.logger.log('═══════════════════════════════════════════════════\n');

                return response;
            },
            (error: AxiosError) => {
                const requestId = error.config?.headers?.['X-Request-ID'] || 'unknown';
                
                this.logger.error('═══════════════════════════════════════════════════');
                this.logger.error(`❌ HTTP ERROR RESPONSE [${requestId}]`);
                this.logger.error('═══════════════════════════════════════════════════');
                this.logger.error(`📍 Method: ${error.config?.method?.toUpperCase()}`);
                this.logger.error(`🔗 URL: ${error.config?.baseURL}${error.config?.url}`);
                
                if (error.response) {
                    this.logger.error(`📊 Status: ${error.response.status} ${error.response.statusText}`);
                    this.logger.error(`📥 Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
                } else if (error.request) {
                    this.logger.error('📡 No response received');
                    this.logger.error(`Request: ${JSON.stringify(error.request, null, 2)}`);
                } else {
                    this.logger.error(`💥 Error: ${error.message}`);
                }
                
                this.logger.error(`⏰ Timestamp: ${new Date().toISOString()}`);
                this.logger.error('═══════════════════════════════════════════════════\n');

                return Promise.reject(error);
            }
        );
    }

    private generateRequestId(): string {
        return `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private calculateDuration(response: AxiosResponse): number {
        const requestTime = response.config.headers?.['X-Request-Time'];
        if (requestTime) {
            return Date.now() - parseInt(requestTime as string, 10);
        }
        return 0;
    }

    private sanitizeHeaders(headers: any): any {
        const sanitized = { ...headers };
        const sensitiveKeys = ['authorization', 'Authorization', 'api-key', 'x-api-key'];
        
        sensitiveKeys.forEach(key => {
            if (sanitized[key]) {
                sanitized[key] = this.maskSensitiveData(sanitized[key]);
            }
        });
        
        return sanitized;
    }

    private sanitizePayload(data: any): any {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const sanitized = Array.isArray(data) ? [...data] : { ...data };
        const sensitiveKeys = [
            'password',
            'token',
            'secret',
            'apiKey',
            'privateKey',
            'number', // número de tarjeta
            'cvc',
            'cvv',
            'card_number',
            'cardNumber'
        ];

        for (const key in sanitized) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
                sanitized[key] = this.maskSensitiveData(sanitized[key]);
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizePayload(sanitized[key]);
            }
        }

        return sanitized;
    }

    private maskSensitiveData(value: any): string {
        if (typeof value !== 'string') {
            return '***MASKED***';
        }

        if (value.length <= 4) {
            return '****';
        }

        // Mostrar solo los últimos 4 caracteres
        return `****${value.slice(-4)}`;
    }

    private generateIntegritySignature(reference: string, amountInCents: number, currency: string): string {
        // La firma de integridad se calcula como: reference + amountInCents + currency + integritySecret
        // Según documentación de Wompi: https://docs.wompi.co/docs/colombia/widget-checkout-web/
        const data = `${reference}${amountInCents}${currency}${this.integritySecret}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    async processPayment(request: PaymentRequest): Promise<Result<PaymentResponse>> {
        try {
            this.logger.log(`Processing payment for reference: ${request.reference}`);
            this.logger.log(`Using card token: ${request.cardToken}`);

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

            this.logger.log(`Payment processed successfully: ${transactionResult.getValue().transactionId}`);
            return transactionResult;
        } catch (error) {
            this.logger.error(`Error processing payment: ${error.message}`, error.stack);
            return Result.fail(`Payment processing failed: ${error.message}`);
        }
    }

    async getTransaction(transactionId: string): Promise<Result<PaymentResponse>> {
        try {
            this.logger.log(`Fetching transaction: ${transactionId}`);

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
            this.logger.error(`Error fetching transaction: ${error.message}`, error.stack);
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
            this.logger.error(`Error getting acceptance token: ${error.message}`);
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
            this.logger.error(`Error creating transaction: ${error.message}`);

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