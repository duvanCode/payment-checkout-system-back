import { UpdateStockUseCase } from './update-stock.use-case';
import { ProductRepositoryPort } from '../ports/product.repository.port';
import { Product } from '../../domain/entities/product.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { Result } from '../../shared/result';
import { InsufficientStockException } from '../../shared/exceptions/insufficient-stock.exception';

describe('UpdateStockUseCase', () => {
    let useCase: UpdateStockUseCase;
    let mockProductRepository: jest.Mocked<ProductRepositoryPort>;

    beforeEach(() => {
        mockProductRepository = {
            findById: jest.fn(),
            findAll: jest.fn(),
            findAllWithStock: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        } as jest.Mocked<ProductRepositoryPort>;

        useCase = new UpdateStockUseCase(mockProductRepository);
    });

    describe('execute', () => {
        it('should reduce stock when sufficient stock is available', async () => {
            const mockProduct = new Product(
                'prod-123',
                'Laptop',
                'Gaming laptop',
                Money.from(1500000, 'COP'),
                10,
                'https://example.com/laptop.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));
            mockProductRepository.update.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute('prod-123', 5);

            expect(result.isSuccess).toBe(true);
            expect(mockProduct.getStock()).toBe(5);
            expect(mockProductRepository.findById).toHaveBeenCalledWith('prod-123');
            expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
        });

        it('should reduce stock by 1', async () => {
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
            mockProductRepository.update.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute('prod-456', 1);

            expect(result.isSuccess).toBe(true);
            expect(mockProduct.getStock()).toBe(19);
        });

        it('should reduce all available stock', async () => {
            const mockProduct = new Product(
                'prod-789',
                'Keyboard',
                'Mechanical keyboard',
                Money.from(100000, 'COP'),
                3,
                'https://example.com/keyboard.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));
            mockProductRepository.update.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute('prod-789', 3);

            expect(result.isSuccess).toBe(true);
            expect(mockProduct.getStock()).toBe(0);
        });

        it('should fail when product is not found', async () => {
            mockProductRepository.findById.mockResolvedValue(Result.fail('Product not found'));

            const result = await useCase.execute('non-existent-id', 5);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Product not found');
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });

        it('should throw InsufficientStockException when stock is insufficient', async () => {
            const mockProduct = new Product(
                'prod-low',
                'Low Stock Product',
                'Only a few left',
                Money.from(75000, 'COP'),
                5,
                'https://example.com/low.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            await expect(useCase.execute('prod-low', 10)).rejects.toThrow(
                InsufficientStockException,
            );

            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });

        it('should throw InsufficientStockException when product has zero stock', async () => {
            const mockProduct = new Product(
                'prod-empty',
                'Out of Stock',
                'No units available',
                Money.from(50000, 'COP'),
                0,
                'https://example.com/empty.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

            await expect(useCase.execute('prod-empty', 1)).rejects.toThrow(
                InsufficientStockException,
            );

            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });

        it('should fail when repository update fails', async () => {
            const mockProduct = new Product(
                'prod-fail',
                'Test Product',
                'Will fail to update',
                Money.from(100000, 'COP'),
                10,
                'https://example.com/fail.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));
            mockProductRepository.update.mockResolvedValue(
                Result.fail('Database connection error'),
            );

            const result = await useCase.execute('prod-fail', 5);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Failed to update stock: Database connection error');
        });

        it('should handle large quantity reductions', async () => {
            const mockProduct = new Product(
                'prod-bulk',
                'Bulk Product',
                'Large inventory',
                Money.from(1000, 'COP'),
                1000,
                'https://example.com/bulk.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));
            mockProductRepository.update.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute('prod-bulk', 500);

            expect(result.isSuccess).toBe(true);
            expect(mockProduct.getStock()).toBe(500);
        });

        it('should call both findById and update repository methods', async () => {
            const mockProduct = new Product(
                'prod-order',
                'Order Test',
                'Testing call order',
                Money.from(50000, 'COP'),
                15,
                'https://example.com/order.jpg',
                new Date(),
                new Date(),
            );

            const findByIdSpy = jest
                .spyOn(mockProductRepository, 'findById')
                .mockResolvedValue(Result.ok(mockProduct));
            const updateSpy = jest
                .spyOn(mockProductRepository, 'update')
                .mockResolvedValue(Result.ok(mockProduct));

            await useCase.execute('prod-order', 5);

            expect(findByIdSpy).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
        });

        it('should not modify stock when product not found', async () => {
            mockProductRepository.findById.mockResolvedValue(Result.fail('Product not found'));

            const result = await useCase.execute('prod-missing', 5);

            expect(result.isFailure).toBe(true);
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });

        it('should handle product with exact requested quantity', async () => {
            const mockProduct = new Product(
                'prod-exact',
                'Exact Stock',
                'Perfect match',
                Money.from(80000, 'COP'),
                7,
                'https://example.com/exact.jpg',
                new Date(),
                new Date(),
            );

            mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));
            mockProductRepository.update.mockResolvedValue(Result.ok(mockProduct));

            const result = await useCase.execute('prod-exact', 7);

            expect(result.isSuccess).toBe(true);
            expect(mockProduct.getStock()).toBe(0);
        });
    });
});
