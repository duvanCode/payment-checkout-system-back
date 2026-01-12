import { ServiceAdapter } from './service.adapter';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PaymentRequest } from '../../application/ports/payment-gateway.port';
import { Result } from '../../shared/result';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ServiceAdapter', () => {
    let adapter: ServiceAdapter;
    let mockConfigService: jest.Mocked<ConfigService>;
    let mockAxiosInstance: jest.Mocked<AxiosInstance>;

    beforeEach(() => {
        mockAxiosInstance = {
            get: jest.fn(),
            post: jest.fn(),
            interceptors: {
                request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
                response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
            },
        } as any;

        mockedAxios.create.mockReturnValue(mockAxiosInstance);

        mockConfigService = {
            get: jest.fn((key: string) => {
                const config = {
                    'service.baseUrl': 'https://api.test.com',
                    'service.publicKey': 'pub_test_key',
                    'service.privateKey': 'priv_test_key',
                    'service.integritySecret': 'test_secret',
                };
                return config[key];
            }),
        } as any;

        adapter = new ServiceAdapter(mockConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with configuration values', () => {
            expect(mockConfigService.get).toHaveBeenCalledWith('service.baseUrl');
            expect(mockConfigService.get).toHaveBeenCalledWith('service.publicKey');
            expect(mockConfigService.get).toHaveBeenCalledWith('service.privateKey');
            expect(mockConfigService.get).toHaveBeenCalledWith('service.integritySecret');
        });

        it('should create axios instance with base URL', () => {
            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: 'https://api.test.com',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        });

        it('should setup request and response interceptors', () => {
            expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
            expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
        });
    });

    describe('processPayment', () => {
        const validPaymentRequest: PaymentRequest = {
            amount: 1000,
            currency: 'COP',
            reference: 'REF-123',
            customerEmail: 'test@example.com',
            cardToken: 'tok_test_123',
        };

        it('should process payment successfully', async () => {
            const mockAcceptanceResponse = {
                data: {
                    data: {
                        presigned_acceptance: {
                            acceptance_token: 'accept_token_123',
                        },
                    },
                },
            };

            const mockTransactionResponse = {
                data: {
                    data: {
                        id: 'trans_123',
                        status: 'APPROVED',
                        status_message: 'Transaction approved',
                        reference: 'REF-123',
                        amount_in_cents: 100000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockAcceptanceResponse);
            mockAxiosInstance.post.mockResolvedValueOnce(mockTransactionResponse);

            const result = await adapter.processPayment(validPaymentRequest);

            expect(result.isSuccess).toBe(true);
            const response = result.getValue();
            expect(response.transactionId).toBe('trans_123');
            expect(response.status).toBe('APPROVED');
            expect(response.amount).toBe(1000);
        });

        it('should fail when acceptance token retrieval fails', async () => {
            mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

            const result = await adapter.processPayment(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Failed to get acceptance token');
        });

        it('should fail when transaction creation fails', async () => {
            const mockAcceptanceResponse = {
                data: {
                    data: {
                        presigned_acceptance: {
                            acceptance_token: 'accept_token_123',
                        },
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockAcceptanceResponse);
            mockAxiosInstance.post.mockRejectedValueOnce(new Error('Transaction failed'));

            const result = await adapter.processPayment(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Failed to create transaction');
        });

        it('should include acceptance token in transaction creation', async () => {
            const mockAcceptanceResponse = {
                data: {
                    data: {
                        presigned_acceptance: {
                            acceptance_token: 'accept_token_123',
                        },
                    },
                },
            };

            const mockTransactionResponse = {
                data: {
                    data: {
                        id: 'trans_123',
                        status: 'PENDING',
                        reference: 'REF-123',
                        amount_in_cents: 100000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockAcceptanceResponse);
            mockAxiosInstance.post.mockResolvedValueOnce(mockTransactionResponse);

            await adapter.processPayment(validPaymentRequest);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/transactions',
                expect.objectContaining({
                    acceptance_token: 'accept_token_123',
                }),
                expect.any(Object),
            );
        });

        it('should convert amount to cents correctly', async () => {
            const mockAcceptanceResponse = {
                data: {
                    data: {
                        presigned_acceptance: {
                            acceptance_token: 'accept_token_123',
                        },
                    },
                },
            };

            const mockTransactionResponse = {
                data: {
                    data: {
                        id: 'trans_123',
                        status: 'APPROVED',
                        reference: 'REF-123',
                        amount_in_cents: 100000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockAcceptanceResponse);
            mockAxiosInstance.post.mockResolvedValueOnce(mockTransactionResponse);

            await adapter.processPayment(validPaymentRequest);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/transactions',
                expect.objectContaining({
                    amount_in_cents: 100000,
                }),
                expect.any(Object),
            );
        });

        it('should include integrity signature in transaction', async () => {
            const mockAcceptanceResponse = {
                data: {
                    data: {
                        presigned_acceptance: {
                            acceptance_token: 'accept_token_123',
                        },
                    },
                },
            };

            const mockTransactionResponse = {
                data: {
                    data: {
                        id: 'trans_123',
                        status: 'APPROVED',
                        reference: 'REF-123',
                        amount_in_cents: 100000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockAcceptanceResponse);
            mockAxiosInstance.post.mockResolvedValueOnce(mockTransactionResponse);

            await adapter.processPayment(validPaymentRequest);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/transactions',
                expect.objectContaining({
                    signature: expect.any(String),
                }),
                expect.any(Object),
            );
        });

        it('should handle service error with detailed messages', async () => {
            const mockAcceptanceResponse = {
                data: {
                    data: {
                        presigned_acceptance: {
                            acceptance_token: 'accept_token_123',
                        },
                    },
                },
            };

            const serviceError = {
                response: {
                    data: {
                        error: {
                            type: 'CARD_DECLINED',
                            messages: {
                                card: ['Insufficient funds', 'Card expired'],
                            },
                        },
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockAcceptanceResponse);
            mockAxiosInstance.post.mockRejectedValueOnce(serviceError);

            const result = await adapter.processPayment(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('service error');
            expect(result.getError()).toContain('CARD_DECLINED');
        });

        it('should use authorization header with private key', async () => {
            const mockAcceptanceResponse = {
                data: {
                    data: {
                        presigned_acceptance: {
                            acceptance_token: 'accept_token_123',
                        },
                    },
                },
            };

            const mockTransactionResponse = {
                data: {
                    data: {
                        id: 'trans_123',
                        status: 'APPROVED',
                        reference: 'REF-123',
                        amount_in_cents: 100000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockAcceptanceResponse);
            mockAxiosInstance.post.mockResolvedValueOnce(mockTransactionResponse);

            await adapter.processPayment(validPaymentRequest);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/transactions',
                expect.any(Object),
                expect.objectContaining({
                    headers: {
                        Authorization: 'Bearer priv_test_key',
                    },
                }),
            );
        });
    });

    describe('getTransaction', () => {
        it('should retrieve transaction by ID successfully', async () => {
            const mockResponse = {
                data: {
                    data: {
                        id: 'trans_123',
                        status: 'APPROVED',
                        status_message: 'Payment approved',
                        reference: 'REF-123',
                        amount_in_cents: 100000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

            const result = await adapter.getTransaction('trans_123');

            expect(result.isSuccess).toBe(true);
            const response = result.getValue();
            expect(response.transactionId).toBe('trans_123');
            expect(response.status).toBe('APPROVED');
            expect(response.amount).toBe(1000);
        });

        it('should use correct endpoint and authorization', async () => {
            const mockResponse = {
                data: {
                    data: {
                        id: 'trans_456',
                        status: 'PENDING',
                        reference: 'REF-456',
                        amount_in_cents: 50000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

            await adapter.getTransaction('trans_456');

            expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                '/transactions/trans_456',
                expect.objectContaining({
                    headers: {
                        Authorization: 'Bearer priv_test_key',
                    },
                }),
            );
        });

        it('should handle transaction not found error', async () => {
            mockAxiosInstance.get.mockRejectedValueOnce(new Error('Transaction not found'));

            const result = await adapter.getTransaction('nonexistent');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Failed to fetch transaction');
        });

        it('should convert amount from cents to currency', async () => {
            const mockResponse = {
                data: {
                    data: {
                        id: 'trans_789',
                        status: 'DECLINED',
                        reference: 'REF-789',
                        amount_in_cents: 250000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

            const result = await adapter.getTransaction('trans_789');

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().amount).toBe(2500);
        });

        it('should handle missing status message', async () => {
            const mockResponse = {
                data: {
                    data: {
                        id: 'trans_999',
                        status: 'APPROVED',
                        reference: 'REF-999',
                        amount_in_cents: 100000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

            const result = await adapter.getTransaction('trans_999');

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().statusMessage).toBe('');
        });

        it('should return all transaction fields', async () => {
            const mockResponse = {
                data: {
                    data: {
                        id: 'trans_full',
                        status: 'APPROVED',
                        status_message: 'Success',
                        reference: 'REF-FULL',
                        amount_in_cents: 150000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-15T10:30:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

            const result = await adapter.getTransaction('trans_full');

            expect(result.isSuccess).toBe(true);
            const response = result.getValue();
            expect(response.transactionId).toBe('trans_full');
            expect(response.status).toBe('APPROVED');
            expect(response.statusMessage).toBe('Success');
            expect(response.reference).toBe('REF-FULL');
            expect(response.amount).toBe(1500);
            expect(response.currency).toBe('COP');
            expect(response.paymentMethod).toBe('CARD');
            expect(response.createdAt).toBe('2024-01-15T10:30:00Z');
        });

        it('should handle network errors', async () => {
            mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network timeout'));

            const result = await adapter.getTransaction('trans_timeout');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Failed to fetch transaction');
            expect(result.getError()).toContain('Network timeout');
        });
    });

    describe('acceptance token retrieval', () => {
        it('should call correct merchant endpoint with public key', async () => {
            const mockAcceptanceResponse = {
                data: {
                    data: {
                        presigned_acceptance: {
                            acceptance_token: 'accept_token_123',
                        },
                    },
                },
            };

            const mockTransactionResponse = {
                data: {
                    data: {
                        id: 'trans_123',
                        status: 'APPROVED',
                        reference: 'REF-123',
                        amount_in_cents: 100000,
                        currency: 'COP',
                        payment_method_type: 'CARD',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockAcceptanceResponse);
            mockAxiosInstance.post.mockResolvedValueOnce(mockTransactionResponse);

            const validPaymentRequest: PaymentRequest = {
                amount: 1000,
                currency: 'COP',
                reference: 'REF-123',
                customerEmail: 'test@example.com',
                cardToken: 'tok_test_123',
            };

            await adapter.processPayment(validPaymentRequest);

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/merchants/pub_test_key');
        });

        it('should handle missing presigned acceptance', async () => {
            const mockAcceptanceResponse = {
                data: {
                    data: {},
                },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockAcceptanceResponse);

            const validPaymentRequest: PaymentRequest = {
                amount: 1000,
                currency: 'COP',
                reference: 'REF-123',
                customerEmail: 'test@example.com',
                cardToken: 'tok_test_123',
            };

            const result = await adapter.processPayment(validPaymentRequest);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Failed to get acceptance token');
        });
    });
});
