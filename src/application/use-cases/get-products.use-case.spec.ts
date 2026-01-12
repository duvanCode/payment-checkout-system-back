import { GetProductsUseCase } from './get-products.use-case';
import { ProductRepositoryPort } from '../ports/product.repository.port';
import { Product } from '../../domain/entities/product.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { Result } from '../../shared/result';

describe('GetProductsUseCase', () => {
    let useCase: GetProductsUseCase;
    let mockProductRepository: jest.Mocked<ProductRepositoryPort>;

    beforeEach(() => {
        mockProductRepository = {
            findById: jest.fn(),
            findAll: jest.fn(),
            findAllWithStock: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        } as jest.Mocked<ProductRepositoryPort>;

        useCase = new GetProductsUseCase(mockProductRepository);
    });

    describe('execute', () => {
        it('should return list of products with stock', async () => {
            const mockProducts = [
                new Product(
                    'prod-1',
                    'Laptop',
                    'Gaming laptop',
                    Money.from(1500000, 'COP'),
                    10,
                    'https://example.com/laptop.jpg',
                    new Date('2024-01-01'),
                    new Date('2024-01-01'),
                ),
                new Product(
                    'prod-2',
                    'Mouse',
                    'Gaming mouse',
                    Money.from(50000, 'COP'),
                    25,
                    'https://example.com/mouse.jpg',
                    new Date('2024-01-02'),
                    new Date('2024-01-02'),
                ),
            ];

            mockProductRepository.findAllWithStock.mockResolvedValue(Result.ok(mockProducts));

            const result = await useCase.execute();

            expect(result.isSuccess).toBe(true);
            const response = result.getValue();
            expect(response.products).toHaveLength(2);
            expect(response.total).toBe(2);
            expect(response.products[0]).toEqual({
                id: 'prod-1',
                name: 'Laptop',
                description: 'Gaming laptop',
                price: 1500000,
                stock: 10,
                imageUrl: 'https://example.com/laptop.jpg',
            });
            expect(response.products[1]).toEqual({
                id: 'prod-2',
                name: 'Mouse',
                description: 'Gaming mouse',
                price: 50000,
                stock: 25,
                imageUrl: 'https://example.com/mouse.jpg',
            });
        });

        it('should return empty list when no products exist', async () => {
            mockProductRepository.findAllWithStock.mockResolvedValue(Result.ok([]));

            const result = await useCase.execute();

            expect(result.isSuccess).toBe(true);
            const response = result.getValue();
            expect(response.products).toHaveLength(0);
            expect(response.total).toBe(0);
        });

        it('should return single product', async () => {
            const mockProduct = new Product(
                'prod-1',
                'Keyboard',
                'Mechanical keyboard',
                Money.from(100000, 'COP'),
                5,
                'https://example.com/keyboard.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findAllWithStock.mockResolvedValue(Result.ok([mockProduct]));

            const result = await useCase.execute();

            expect(result.isSuccess).toBe(true);
            const response = result.getValue();
            expect(response.products).toHaveLength(1);
            expect(response.total).toBe(1);
            expect(response.products[0].id).toBe('prod-1');
        });

        it('should fail when repository returns error', async () => {
            mockProductRepository.findAllWithStock.mockResolvedValue(
                Result.fail('Database connection error'),
            );

            const result = await useCase.execute();

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Database connection error');
        });

        it('should handle products with zero stock', async () => {
            const mockProduct = new Product(
                'prod-out',
                'Out of Stock Product',
                'Currently unavailable',
                Money.from(75000, 'COP'),
                0,
                'https://example.com/out.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findAllWithStock.mockResolvedValue(Result.ok([mockProduct]));

            const result = await useCase.execute();

            expect(result.isSuccess).toBe(true);
            const response = result.getValue();
            expect(response.products[0].stock).toBe(0);
        });

        it('should handle products with large stock quantities', async () => {
            const mockProduct = new Product(
                'prod-bulk',
                'Bulk Product',
                'Large inventory',
                Money.from(1000, 'COP'),
                999999,
                'https://example.com/bulk.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findAllWithStock.mockResolvedValue(Result.ok([mockProduct]));

            const result = await useCase.execute();

            expect(result.isSuccess).toBe(true);
            const response = result.getValue();
            expect(response.products[0].stock).toBe(999999);
        });

        it('should map all product properties correctly', async () => {
            const mockProduct = new Product(
                'prod-test',
                'Test Product',
                'Test Description',
                Money.from(123456, 'COP'),
                42,
                'https://example.com/test.jpg',
                new Date('2024-01-01'),
                new Date('2024-01-02'),
            );

            mockProductRepository.findAllWithStock.mockResolvedValue(Result.ok([mockProduct]));

            const result = await useCase.execute();

            expect(result.isSuccess).toBe(true);
            const response = result.getValue();
            const product = response.products[0];
            expect(product.id).toBe('prod-test');
            expect(product.name).toBe('Test Product');
            expect(product.description).toBe('Test Description');
            expect(product.price).toBe(123456);
            expect(product.stock).toBe(42);
            expect(product.imageUrl).toBe('https://example.com/test.jpg');
        });

        it('should handle multiple products with different prices', async () => {
            const mockProducts = [
                new Product(
                    'prod-cheap',
                    'Cheap Product',
                    'Low price',
                    Money.from(1000, 'COP'),
                    100,
                    'https://example.com/cheap.jpg',
                    new Date(),
                    new Date(),
                ),
                new Product(
                    'prod-expensive',
                    'Expensive Product',
                    'High price',
                    Money.from(5000000, 'COP'),
                    2,
                    'https://example.com/expensive.jpg',
                    new Date(),
                    new Date(),
                ),
            ];

            mockProductRepository.findAllWithStock.mockResolvedValue(Result.ok(mockProducts));

            const result = await useCase.execute();

            expect(result.isSuccess).toBe(true);
            const response = result.getValue();
            expect(response.products[0].price).toBe(1000);
            expect(response.products[1].price).toBe(5000000);
        });

        it('should call repository findAllWithStock method', async () => {
            mockProductRepository.findAllWithStock.mockResolvedValue(Result.ok([]));

            await useCase.execute();

            expect(mockProductRepository.findAllWithStock).toHaveBeenCalledTimes(1);
        });

        it('should handle repository timeout error', async () => {
            mockProductRepository.findAllWithStock.mockResolvedValue(
                Result.fail('Query timeout'),
            );

            const result = await useCase.execute();

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('timeout');
        });
    });
});
