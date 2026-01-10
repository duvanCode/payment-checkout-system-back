import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
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
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('service.baseUrl') as string;
        this.publicKey = this.configService.get<string>('service.publicKey') as string;
        this.privateKey = this.configService.get<string>('service.privateKey') as string;

        this.httpClient = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.logger.log('Service adapter initialized');
    }

    async processPayment(request: PaymentRequest): Promise<Result<PaymentResponse>> {
        try {
            this.logger.log(`Processing payment for reference: ${request.reference}`);

            // PASO 1: Crear token de la tarjeta
            const cardTokenResult = await this.createCardToken(request);
            if (cardTokenResult.isFailure) {
                return Result.fail(cardTokenResult.getError());
            }
            const cardToken = cardTokenResult.getValue();

            // PASO 2: Obtener token de aceptación
            const acceptanceTokenResult = await this.getAcceptanceToken();
            if (acceptanceTokenResult.isFailure) {
                return Result.fail(acceptanceTokenResult.getError());
            }
            const acceptanceToken = acceptanceTokenResult.getValue();

            // PASO 3: Crear transacción
            const transactionResult = await this.createTransaction({
                ...request,
                cardToken,
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

    private async createCardToken(request: PaymentRequest): Promise<Result<string>> {
        try {
            const response = await this.httpClient.post('/tokens/cards', {
                number: request.cardNumber,
                cvc: request.cvv,
                exp_month: request.expirationMonth,
                exp_year: request.expirationYear,
                card_holder: request.cardHolderName,
            }, {
                headers: {
                    Authorization: `Bearer ${this.publicKey}`,
                },
            });

            if (response.data.status === 'CREATED') {
                return Result.ok(response.data.data.id);
            }

            return Result.fail('Failed to create card token');
        } catch (error) {
            this.logger.error(`Error creating card token: ${error.message}`);

            if (error.response?.data?.error) {
                return Result.fail(`Card token error: ${error.response.data.error.type}`);
            }

            return Result.fail(`Failed to create card token: ${error.message}`);
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
            const response = await this.httpClient.post(
                '/transactions',
                {
                    acceptance_token: data.acceptanceToken,
                    amount_in_cents: Math.round(data.amount * 100), // Convertir a centavos
                    currency: data.currency,
                    customer_email: data.customerEmail,
                    reference: data.reference,
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
                return Result.fail(
                    `service error: ${serviceError.type} - ${serviceError.messages?.join(', ') || 'Unknown error'}`,
                );
            }

            return Result.fail(`Failed to create transaction: ${error.message}`);
        }
    }
}