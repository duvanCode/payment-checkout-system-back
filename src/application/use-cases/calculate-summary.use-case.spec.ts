import { CalculateSummaryUseCase } from './calculate-summary.use-case';
import { ProductRepositoryPort } from '../ports/product.repository.port';
import { Product } from '../../domain/entities/product.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { Result } from '../../shared/result';
import { FEES } from '../../shared/constants/fees.constants';

describe('CalculateSummaryUseCase', () => {
    let useCase: CalculateSummaryUseCase;
    let mockProductRepository: jest.Mocked<ProductRepositoryPort>;

    beforeEach(() => {
        mockProductRepository = {
            findById: jest.fn(),
            findAll: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        } as jest.Mocked<ProductRepositoryPort>;

        useCase = new CalculateSummaryUseCase(mockProductRepository);
    });

    describe('execute - success cases', () => {
        it('should calculate summary for valid product in local city', async () => {
            const mockProduct = new Product(
                'prod-123',
                'Gaming Laptop',
                'High-performance laptop',
                Money.from(1000000, 'COP'),
                10,
                'https://example.com/laptop.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute({
                productId: 'prod-123',
                quantity: 2,
                deliveryCity: 'Bogotá',
            });

            expect(result.isSuccess).toBe(true);
            const summary = result.getValue();
            expect(summary.productId).toBe('prod-123');
            expect(summary.productName).toBe('Gaming Laptop');
            expect(summary.productPrice).toBe(1000000);
            expect(summary.quantity).toBe(2);
            expect(summary.subtotal).toBe(2000000);
            expect(summary.baseFee).toBe(FEES.BASE_FEE);
            expect(summary.deliveryFee).toBe(FEES.DELIVERY_FEE_LOCAL);
            expect(summary.total).toBe(2000000 + FEES.BASE_FEE + FEES.DELIVERY_FEE_LOCAL);
            expect(summary.deliveryCity).toBe('Bogotá');
        });

        it('should calculate summary for valid product in national city', async () => {
            const mockProduct = new Product(
                'prod-456',
                'Mouse',
                'Gaming mouse',
                Money.from(50000, 'COP'),
                20,
                'https://example.com/mouse.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute({
                productId: 'prod-456',
                quantity: 1,
                deliveryCity: 'Medellín',
            });

            expect(result.isSuccess).toBe(true);
            const summary = result.getValue();
            expect(summary.subtotal).toBe(50000);
            expect(summary.deliveryFee).toBe(FEES.DELIVERY_FEE_NATIONAL);
            expect(summary.total).toBe(50000 + FEES.BASE_FEE + FEES.DELIVERY_FEE_NATIONAL);
        });

        it('should calculate summary for quantity greater than 1', async () => {
            const mockProduct = new Product(
                'prod-789',
                'Keyboard',
                'Mechanical keyboard',
                Money.from(100000, 'COP'),
                15,
                'https://example.com/keyboard.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute({
                productId: 'prod-789',
                quantity: 5,
                deliveryCity: 'Cali',
            });

            expect(result.isSuccess).toBe(true);
            const summary = result.getValue();
            expect(summary.subtotal).toBe(500000);
            expect(summary.quantity).toBe(5);
        });

        it('should calculate summary when quantity equals available stock', async () => {
            const mockProduct = new Product(
                'prod-999',
                'Limited Product',
                'Last units',
                Money.from(200000, 'COP'),
                3,
                'https://example.com/limited.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute({
                productId: 'prod-999',
                quantity: 3,
                deliveryCity: 'Bogotá',
            });

            expect(result.isSuccess).toBe(true);
            const summary = result.getValue();
            expect(summary.quantity).toBe(3);
            expect(summary.subtotal).toBe(600000);
        });

        it('should handle different local cities correctly', async () => {
            const mockProduct = new Product(
                'prod-123',
                'Test Product',
                'Description',
                Money.from(50000, 'COP'),
                10,
                'https://example.com/test.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const localCities = ['Bogotá', 'Soacha', 'Chía', 'Cajicá', 'Zipaquirá'];

            for (const city of localCities) {
                const result = await useCase.execute({
                    productId: 'prod-123',
                    quantity: 1,
                    deliveryCity: city,
                });

                expect(result.isSuccess).toBe(true);
                const summary = result.getValue();
                expect(summary.deliveryFee).toBe(FEES.DELIVERY_FEE_LOCAL);
            }
        });
    });

    describe('execute - validation errors', () => {
        it('should fail when quantity is zero', async () => {
            const result = await useCase.execute({
                productId: 'prod-123',
                quantity: 0,
                deliveryCity: 'Bogotá',
            });

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Quantity must be greater than 0');
            expect(mockProductRepository.findById).not.toHaveBeenCalled();
        });

        it('should fail when quantity is negative', async () => {
            const result = await useCase.execute({
                productId: 'prod-123',
                quantity: -1,
                deliveryCity: 'Bogotá',
            });

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Quantity must be greater than 0');
            expect(mockProductRepository.findById).not.toHaveBeenCalled();
        });

        it('should fail when product is not found', async () => {
            mockProductRepository.findById.mockResolvedValue(Result.fail('Product not found'));

            const result = await useCase.execute({
                productId: 'non-existent-id',
                quantity: 1,
                deliveryCity: 'Bogotá',
            });

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Product not found');
            expect(mockProductRepository.findById).toHaveBeenCalledWith('non-existent-id');
        });

        it('should fail when insufficient stock', async () => {
            const mockProduct = new Product(
                'prod-123',
                'Low Stock Product',
                'Only 5 units left',
                Money.from(100000, 'COP'),
                5,
                'https://example.com/low-stock.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute({
                productId: 'prod-123',
                quantity: 10,
                deliveryCity: 'Bogotá',
            });

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Insufficient stock. Available: 5, Requested: 10');
        });

        it('should fail when product has zero stock', async () => {
            const mockProduct = new Product(
                'prod-456',
                'Out of Stock Product',
                'No units available',
                Money.from(100000, 'COP'),
                0,
                'https://example.com/out-of-stock.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute({
                productId: 'prod-456',
                quantity: 1,
                deliveryCity: 'Bogotá',
            });

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Insufficient stock. Available: 0, Requested: 1');
        });
    });

    describe('execute - edge cases', () => {
        it('should handle product with very low price', async () => {
            const mockProduct = new Product(
                'prod-cheap',
                'Cheap Product',
                'Very affordable',
                Money.from(100, 'COP'),
                10,
                'https://example.com/cheap.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute({
                productId: 'prod-cheap',
                quantity: 1,
                deliveryCity: 'Bogotá',
            });

            expect(result.isSuccess).toBe(true);
            const summary = result.getValue();
            expect(summary.subtotal).toBe(100);
            expect(summary.total).toBe(100 + FEES.BASE_FEE + FEES.DELIVERY_FEE_LOCAL);
        });

        it('should handle product with very high price', async () => {
            const mockProduct = new Product(
                'prod-expensive',
                'Expensive Product',
                'Premium quality',
                Money.from(10000000, 'COP'),
                2,
                'https://example.com/expensive.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute({
                productId: 'prod-expensive',
                quantity: 1,
                deliveryCity: 'Medellín',
            });

            expect(result.isSuccess).toBe(true);
            const summary = result.getValue();
            expect(summary.subtotal).toBe(10000000);
            expect(summary.total).toBe(10000000 + FEES.BASE_FEE + FEES.DELIVERY_FEE_NATIONAL);
        });

        it('should handle large quantity orders', async () => {
            const mockProduct = new Product(
                'prod-bulk',
                'Bulk Product',
                'Wholesale available',
                Money.from(1000, 'COP'),
                1000,
                'https://example.com/bulk.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute({
                productId: 'prod-bulk',
                quantity: 500,
                deliveryCity: 'Bogotá',
            });

            expect(result.isSuccess).toBe(true);
            const summary = result.getValue();
            expect(summary.quantity).toBe(500);
            expect(summary.subtotal).toBe(500000);
        });

        it('should handle city names with different casing', async () => {
            const mockProduct = new Product(
                'prod-123',
                'Test Product',
                'Description',
                Money.from(50000, 'COP'),
                10,
                'https://example.com/test.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute({
                productId: 'prod-123',
                quantity: 1,
                deliveryCity: 'BOGOTÁ',
            });

            expect(result.isSuccess).toBe(true);
            const summary = result.getValue();
            expect(summary.deliveryFee).toBe(FEES.DELIVERY_FEE_LOCAL);
        });
    });

    describe('repository interaction', () => {
        it('should call repository findById with correct product id', async () => {
            const mockProduct = new Product(
                'prod-test-123',
                'Test Product',
                'Description',
                Money.from(100000, 'COP'),
                10,
                'https://example.com/test.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            await useCase.execute({
                productId: 'prod-test-123',
                quantity: 1,
                deliveryCity: 'Bogotá',
            });

            expect(mockProductRepository.findById).toHaveBeenCalledTimes(1);
            expect(mockProductRepository.findById).toHaveBeenCalledWith('prod-test-123');
        });

        it('should not call repository when quantity validation fails', async () => {
            await useCase.execute({
                productId: 'prod-123',
                quantity: 0,
                deliveryCity: 'Bogotá',
            });

            expect(mockProductRepository.findById).not.toHaveBeenCalled();
        });
    });
});
