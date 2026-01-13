import { CreateTransactionUseCase } from './create-transaction.use-case';
import { TransactionRepositoryPort } from '../ports/transaction.repository.port';
import { CustomerRepositoryPort } from '../ports/customer.repository.port';
import { Transaction } from '../../domain/entities/transaction.entity';
import { Customer } from '../../domain/entities/customer.entity';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { Money } from '../../domain/value-objects/money.vo';
import { Result } from '../../shared/result';

describe('CreateTransactionUseCase', () => {
    let useCase: CreateTransactionUseCase;
    let mockTransactionRepository: jest.Mocked<TransactionRepositoryPort>;
    let mockCustomerRepository: jest.Mocked<CustomerRepositoryPort>;

    beforeEach(() => {
        mockTransactionRepository = {
            findById: jest.fn(),
            findByTransactionNumber: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            findPendingTransactions: jest.fn(),
        } as jest.Mocked<TransactionRepositoryPort>;

        mockCustomerRepository = {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        } as unknown as jest.Mocked<CustomerRepositoryPort>;

        useCase = new CreateTransactionUseCase(
            mockTransactionRepository,
            mockCustomerRepository,
        );
    });

    describe('execute', () => {
        const validInput = {
            items: [
                {
                    productId: 'prod-123',
                    productName: 'Test Product',
                    quantity: 2,
                    price: 50000,
                    subtotal: 100000
                }

            ],
            subtotal: 100000,
            baseFee: 2000,
            deliveryFee: 5000,
            total: 107000,
            customerEmail: 'test@example.com',
            customerPhone: '3001234567',
            customerFullName: 'John Doe',
        };


        it('should create transaction with existing customer', async () => {
            const existingCustomer = new Customer(
                'cust-123',
                'test@example.com',
                '3001234567',
                'John Doe',
                new Date('2024-01-01'),
                new Date('2024-01-01'),
            );

            const savedTransaction = new Transaction(
                'trans-456',
                'TRX-1234567890-ABC',
                TransactionStatus.PENDING,
                'cust-123',
                Money.from(100000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(107000, 'COP'),
                [], // Items mock (can be empty for this test)
                new Date(),
                new Date(),
            );

            mockCustomerRepository.findByEmail.mockResolvedValue(Result.ok(existingCustomer));
            mockTransactionRepository.save.mockResolvedValue(Result.ok(savedTransaction));

            const result = await useCase.execute(validInput);

            expect(result.isSuccess).toBe(true);
            expect(mockCustomerRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockCustomerRepository.save).not.toHaveBeenCalled();
            expect(mockTransactionRepository.save).toHaveBeenCalled();
        });

        it('should create new customer when customer does not exist', async () => {
            const newCustomer = new Customer(
                'cust-new-789',
                'newuser@example.com',
                '3109876543',
                'Jane Smith',
                new Date(),
                new Date(),
            );

            const savedTransaction = new Transaction(
                'trans-new-999',
                'TRX-9876543210-XYZ',
                TransactionStatus.PENDING,
                'cust-new-789',
                Money.from(50000, 'COP'),
                Money.from(2000, 'COP'),
                Money.from(5000, 'COP'),
                Money.from(57000, 'COP'),
                [],
                new Date(),
                new Date(),
            );

            mockCustomerRepository.findByEmail.mockResolvedValue(
                Result.fail('Customer not found'),
            );
            mockCustomerRepository.save.mockResolvedValue(Result.ok(newCustomer));
            mockTransactionRepository.save.mockResolvedValue(Result.ok(savedTransaction));

            const input = {
                ...validInput,
                customerEmail: 'newuser@example.com',
                customerPhone: '3109876543',
                customerFullName: 'Jane Smith',
            };

            const result = await useCase.execute(input);

            expect(result.isSuccess).toBe(true);
            expect(mockCustomerRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com');
            expect(mockCustomerRepository.save).toHaveBeenCalled();
            expect(mockTransactionRepository.save).toHaveBeenCalled();
        });

        it('should create transaction with PENDING status', async () => {
            const customer = new Customer(
                'cust-status',
                'status@example.com',
                '3001234567',
                'Status Test',
                new Date(),
                new Date(),
            );

            mockCustomerRepository.findByEmail.mockResolvedValue(Result.ok(customer));

            const saveSpy = jest.spyOn(mockTransactionRepository, 'save').mockImplementation(
                async (transaction: Transaction) => {
                    expect(transaction.getStatus()).toBe(TransactionStatus.PENDING);
                    expect(transaction.isPending()).toBe(true);
                    return Result.ok(transaction);
                },
            );

            const result = await useCase.execute(validInput);

            expect(result.isSuccess).toBe(true);
            expect(saveSpy).toHaveBeenCalled();
        });

        it('should fail when customer creation fails', async () => {
            mockCustomerRepository.findByEmail.mockResolvedValue(
                Result.fail('Customer not found'),
            );
            mockCustomerRepository.save.mockResolvedValue(
                Result.fail('Database error: cannot save customer'),
            );

            const result = await useCase.execute(validInput);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Database error: cannot save customer');
            expect(mockTransactionRepository.save).not.toHaveBeenCalled();
        });

        it('should fail when transaction save fails', async () => {
            const customer = new Customer(
                'cust-fail',
                'fail@example.com',
                '3001234567',
                'Fail Test',
                new Date(),
                new Date(),
            );

            mockCustomerRepository.findByEmail.mockResolvedValue(Result.ok(customer));
            mockTransactionRepository.save.mockResolvedValue(
                Result.fail('Transaction save error'),
            );

            const result = await useCase.execute(validInput);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Failed to create transaction: Transaction save error');
        });

        it('should create transaction with correct amounts', async () => {
            const customer = new Customer(
                'cust-amounts',
                'amounts@example.com',
                '3001234567',
                'Amounts Test',
                new Date(),
                new Date(),
            );

            mockCustomerRepository.findByEmail.mockResolvedValue(Result.ok(customer));

            const saveSpy = jest.spyOn(mockTransactionRepository, 'save').mockImplementation(
                async (transaction: Transaction) => {
                    const json = transaction.toJSON();
                    expect(json.subtotal).toBe(100000);
                    expect(json.baseFee).toBe(2000);
                    expect(json.deliveryFee).toBe(5000);
                    expect(json.total).toBe(107000);
                    return Result.ok(transaction);
                },
            );

            await useCase.execute(validInput);

            expect(saveSpy).toHaveBeenCalled();
        });

        it('should create transaction with correct product and customer IDs', async () => {
            const customer = new Customer(
                'cust-ids-777',
                'ids@example.com',
                '3001234567',
                'IDs Test',
                new Date(),
                new Date(),
            );

            mockCustomerRepository.findByEmail.mockResolvedValue(Result.ok(customer));

            const saveSpy = jest.spyOn(mockTransactionRepository, 'save').mockImplementation(
                async (transaction: Transaction) => {
                    const json = transaction.toJSON();
                    expect(json.items[0].productId).toBe('prod-123');
                    expect(json.customerId).toBe('cust-ids-777');
                    return Result.ok(transaction);
                },
            );

            await useCase.execute(validInput);

            expect(saveSpy).toHaveBeenCalled();
        });

        it('should create transaction with correct quantity', async () => {
            const customer = new Customer(
                'cust-qty',
                'qty@example.com',
                '3001234567',
                'Quantity Test',
                new Date(),
                new Date(),
            );

            mockCustomerRepository.findByEmail.mockResolvedValue(Result.ok(customer));

            const saveSpy = jest.spyOn(mockTransactionRepository, 'save').mockImplementation(
                async (transaction: Transaction) => {
                    const json = transaction.toJSON();
                    expect(json.items[0].quantity).toBe(2);
                    return Result.ok(transaction);
                },
            );

            await useCase.execute(validInput);

            expect(saveSpy).toHaveBeenCalled();
        });

        it('should handle large transaction amounts', async () => {
            const customer = new Customer(
                'cust-large',
                'large@example.com',
                '3001234567',
                'Large Test',
                new Date(),
                new Date(),
            );

            mockCustomerRepository.findByEmail.mockResolvedValue(Result.ok(customer));
            mockTransactionRepository.save.mockResolvedValue(
                Result.ok({} as any),
            );

            const largeInput = {
                items: [
                    {
                        productId: 'prod-expensive',
                        quantity: 5,
                        price: 2000000,
                        subtotal: 10000000
                    }
                ],
                subtotal: 10000000,
                baseFee: 2000,
                deliveryFee: 10000,
                total: 10012000,
                customerEmail: 'large@example.com',
                customerPhone: '3001234567',
                customerFullName: 'Large Test',
            };

            const result = await useCase.execute(largeInput);

            expect(result.isSuccess).toBe(true);
        });

        it('should handle single quantity transactions', async () => {
            const customer = new Customer(
                'cust-single',
                'single@example.com',
                '3001234567',
                'Single Test',
                new Date(),
                new Date(),
            );

            mockCustomerRepository.findByEmail.mockResolvedValue(Result.ok(customer));
            mockTransactionRepository.save.mockResolvedValue(
                Result.ok({} as any),
            );

            const singleInput = {
                ...validInput,
                items: [
                    { productId: 'prod-123', quantity: 1, price: 50000, subtotal: 50000 }
                ],
                subtotal: 50000,
                total: 57000,
            };

            const result = await useCase.execute(singleInput);

            expect(result.isSuccess).toBe(true);
        });

        it('should call both customer and transaction repositories', async () => {
            const customer = new Customer(
                'cust-order',
                'order@example.com',
                '3001234567',
                'Order Test',
                new Date(),
                new Date(),
            );

            const findEmailSpy = jest
                .spyOn(mockCustomerRepository, 'findByEmail')
                .mockResolvedValue(Result.ok(customer));

            const saveSpy = jest
                .spyOn(mockTransactionRepository, 'save')
                .mockResolvedValue(Result.ok({} as any));

            await useCase.execute(validInput);

            expect(findEmailSpy).toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalled();
        });

        it('should create customer with invalid email format and let Customer entity validate', async () => {
            mockCustomerRepository.findByEmail.mockResolvedValue(
                Result.fail('Customer not found'),
            );

            const invalidInput = {
                ...validInput,
                items: [{ ...validInput.items[0], customerEmail: 'invalid-email' }], // items still required
                customerEmail: 'invalid-email',
            } as any;

            // This should throw from Customer entity constructor
            await expect(useCase.execute(invalidInput)).rejects.toThrow();
        });

        it('should handle customer with unicode characters in name', async () => {
            const customer = new Customer(
                'cust-unicode',
                'unicode@example.com',
                '3001234567',
                '李明 Wang',
                new Date(),
                new Date(),
            );

            mockCustomerRepository.findByEmail.mockResolvedValue(
                Result.fail('Customer not found'),
            );
            mockCustomerRepository.save.mockResolvedValue(Result.ok(customer));
            mockTransactionRepository.save.mockResolvedValue(
                Result.ok({} as any),
            );

            const unicodeInput = {
                ...validInput,
                customerEmail: 'unicode@example.com',
                customerFullName: '李明 Wang',
            };

            const result = await useCase.execute(unicodeInput);

            expect(result.isSuccess).toBe(true);
        });
    });
});
