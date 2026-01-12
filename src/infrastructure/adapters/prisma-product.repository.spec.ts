import { PrismaProductRepository } from './prisma-product.repository';
import { PrismaService } from '../database/prisma.service';
import { Product } from '../../domain/entities/product.entity';
import { Money } from '../../domain/value-objects/money.vo';

describe('PrismaProductRepository', () => {
    let repository: PrismaProductRepository;
    let mockPrismaService: jest.Mocked<PrismaService>;

    beforeEach(() => {
        mockPrismaService = {
            product: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        } as any;

        repository = new PrismaProductRepository(mockPrismaService);
    });

    describe('findById', () => {
        it('should return product when found', async () => {
            const mockProduct = {
                id: 'prod-123',
                name: 'Laptop',
                description: 'Gaming laptop',
                price: 1500000,
                stock: 10,
                imageUrl: 'https://example.com/laptop.jpg',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };

            mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

            const result = await repository.findById('prod-123');

            expect(result.isSuccess).toBe(true);
            const product = result.getValue();
            expect(product.getId()).toBe('prod-123');
            expect(product.getName()).toBe('Laptop');
            expect(product.getPrice().getAmount()).toBe(1500000);
            expect(product.getStock()).toBe(10);
        });

        it('should return failure when product not found', async () => {
            mockPrismaService.product.findUnique.mockResolvedValue(null);

            const result = await repository.findById('nonexistent');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Product not found');
        });

        it('should handle database errors', async () => {
            mockPrismaService.product.findUnique.mockRejectedValue(
                new Error('Database connection error'),
            );

            const result = await repository.findById('prod-123');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error finding product');
            expect(result.getError()).toContain('Database connection error');
        });

        it('should call findUnique with correct parameters', async () => {
            const mockProduct = {
                id: 'prod-456',
                name: 'Mouse',
                description: 'Gaming mouse',
                price: 50000,
                stock: 25,
                imageUrl: 'https://example.com/mouse.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

            await repository.findById('prod-456');

            expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
                where: { id: 'prod-456' },
            });
        });
    });

    describe('findAll', () => {
        it('should return all products ordered by creation date', async () => {
            const mockProducts = [
                {
                    id: 'prod-1',
                    name: 'Product 1',
                    description: 'Description 1',
                    price: 100000,
                    stock: 5,
                    imageUrl: 'https://example.com/1.jpg',
                    createdAt: new Date('2024-01-02'),
                    updatedAt: new Date('2024-01-02'),
                },
                {
                    id: 'prod-2',
                    name: 'Product 2',
                    description: 'Description 2',
                    price: 200000,
                    stock: 10,
                    imageUrl: 'https://example.com/2.jpg',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                },
            ];

            mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

            const result = await repository.findAll();

            expect(result.isSuccess).toBe(true);
            const products = result.getValue();
            expect(products).toHaveLength(2);
            expect(products[0].getId()).toBe('prod-1');
            expect(products[1].getId()).toBe('prod-2');
        });

        it('should return empty array when no products exist', async () => {
            mockPrismaService.product.findMany.mockResolvedValue([]);

            const result = await repository.findAll();

            expect(result.isSuccess).toBe(true);
            expect(result.getValue()).toHaveLength(0);
        });

        it('should call findMany with correct order', async () => {
            mockPrismaService.product.findMany.mockResolvedValue([]);

            await repository.findAll();

            expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: 'desc' },
            });
        });

        it('should handle database errors', async () => {
            mockPrismaService.product.findMany.mockRejectedValue(new Error('Query timeout'));

            const result = await repository.findAll();

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error finding products');
        });
    });

    describe('findAllWithStock', () => {
        it('should return only products with stock greater than zero', async () => {
            const mockProducts = [
                {
                    id: 'prod-1',
                    name: 'In Stock',
                    description: 'Available product',
                    price: 100000,
                    stock: 5,
                    imageUrl: 'https://example.com/1.jpg',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 'prod-2',
                    name: 'Also In Stock',
                    description: 'Another available',
                    price: 200000,
                    stock: 10,
                    imageUrl: 'https://example.com/2.jpg',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

            const result = await repository.findAllWithStock();

            expect(result.isSuccess).toBe(true);
            expect(result.getValue()).toHaveLength(2);
        });

        it('should call findMany with stock filter', async () => {
            mockPrismaService.product.findMany.mockResolvedValue([]);

            await repository.findAllWithStock();

            expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
                where: { stock: { gt: 0 } },
                orderBy: { createdAt: 'desc' },
            });
        });

        it('should return empty array when no products with stock', async () => {
            mockPrismaService.product.findMany.mockResolvedValue([]);

            const result = await repository.findAllWithStock();

            expect(result.isSuccess).toBe(true);
            expect(result.getValue()).toHaveLength(0);
        });

        it('should handle database errors', async () => {
            mockPrismaService.product.findMany.mockRejectedValue(new Error('Connection lost'));

            const result = await repository.findAllWithStock();

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error finding products with stock');
        });
    });

    describe('save', () => {
        it('should save new product successfully', async () => {
            const product = new Product(
                'prod-new',
                'New Product',
                'Brand new',
                Money.from(150000, 'COP'),
                20,
                'https://example.com/new.jpg',
                new Date(),
                new Date(),
            );

            const mockCreated = {
                id: 'prod-created',
                name: 'New Product',
                description: 'Brand new',
                price: 150000,
                stock: 20,
                imageUrl: 'https://example.com/new.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.product.create.mockResolvedValue(mockCreated);

            const result = await repository.save(product);

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getName()).toBe('New Product');
        });

        it('should call create with correct data', async () => {
            const product = new Product(
                'prod-test',
                'Test Product',
                'Test Description',
                Money.from(100000, 'COP'),
                10,
                'https://example.com/test.jpg',
                new Date(),
                new Date(),
            );

            const mockCreated = {
                id: 'prod-created',
                name: 'Test Product',
                description: 'Test Description',
                price: 100000,
                stock: 10,
                imageUrl: 'https://example.com/test.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.product.create.mockResolvedValue(mockCreated);

            await repository.save(product);

            expect(mockPrismaService.product.create).toHaveBeenCalledWith({
                data: {
                    name: 'Test Product',
                    description: 'Test Description',
                    price: 100000,
                    stock: 10,
                    imageUrl: 'https://example.com/test.jpg',
                },
            });
        });

        it('should handle database errors', async () => {
            const product = new Product(
                'prod-fail',
                'Fail Product',
                'Will fail',
                Money.from(100000, 'COP'),
                10,
                'https://example.com/fail.jpg',
                new Date(),
                new Date(),
            );

            mockPrismaService.product.create.mockRejectedValue(
                new Error('Unique constraint failed'),
            );

            const result = await repository.save(product);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error saving product');
        });
    });

    describe('update', () => {
        it('should update existing product successfully', async () => {
            const product = new Product(
                'prod-123',
                'Updated Product',
                'Updated description',
                Money.from(200000, 'COP'),
                15,
                'https://example.com/updated.jpg',
                new Date('2024-01-01'),
                new Date(),
            );

            const mockUpdated = {
                id: 'prod-123',
                name: 'Updated Product',
                description: 'Updated description',
                price: 200000,
                stock: 15,
                imageUrl: 'https://example.com/updated.jpg',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.product.update.mockResolvedValue(mockUpdated);

            const result = await repository.update(product);

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getName()).toBe('Updated Product');
        });

        it('should call update with correct parameters', async () => {
            const product = new Product(
                'prod-456',
                'Product Name',
                'Description',
                Money.from(150000, 'COP'),
                8,
                'https://example.com/image.jpg',
                new Date('2024-01-01'),
                new Date(),
            );

            const mockUpdated = {
                id: 'prod-456',
                name: 'Product Name',
                description: 'Description',
                price: 150000,
                stock: 8,
                imageUrl: 'https://example.com/image.jpg',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.product.update.mockResolvedValue(mockUpdated);

            await repository.update(product);

            expect(mockPrismaService.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-456' },
                data: {
                    name: 'Product Name',
                    description: 'Description',
                    price: 150000,
                    stock: 8,
                    imageUrl: 'https://example.com/image.jpg',
                    updatedAt: expect.any(Date),
                },
            });
        });

        it('should handle product not found errors', async () => {
            const product = new Product(
                'nonexistent',
                'Product',
                'Description',
                Money.from(100000, 'COP'),
                5,
                'https://example.com/image.jpg',
                new Date(),
                new Date(),
            );

            mockPrismaService.product.update.mockRejectedValue(new Error('Record not found'));

            const result = await repository.update(product);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error updating product');
        });
    });

    describe('updateStock', () => {
        it('should update stock successfully', async () => {
            const mockUpdated = {
                id: 'prod-123',
                name: 'Product',
                description: 'Description',
                price: 100000,
                stock: 25,
                imageUrl: 'https://example.com/image.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.product.update.mockResolvedValue(mockUpdated);

            const result = await repository.updateStock('prod-123', 25);

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getStock()).toBe(25);
        });

        it('should call update with stock data only', async () => {
            const mockUpdated = {
                id: 'prod-789',
                name: 'Product',
                description: 'Description',
                price: 100000,
                stock: 10,
                imageUrl: 'https://example.com/image.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.product.update.mockResolvedValue(mockUpdated);

            await repository.updateStock('prod-789', 10);

            expect(mockPrismaService.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-789' },
                data: {
                    stock: 10,
                    updatedAt: expect.any(Date),
                },
            });
        });

        it('should handle zero stock updates', async () => {
            const mockUpdated = {
                id: 'prod-zero',
                name: 'Product',
                description: 'Description',
                price: 100000,
                stock: 0,
                imageUrl: 'https://example.com/image.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.product.update.mockResolvedValue(mockUpdated);

            const result = await repository.updateStock('prod-zero', 0);

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getStock()).toBe(0);
        });

        it('should handle database errors', async () => {
            mockPrismaService.product.update.mockRejectedValue(new Error('Update failed'));

            const result = await repository.updateStock('prod-fail', 5);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error updating stock');
        });
    });

    describe('toDomain conversion', () => {
        it('should convert database model to domain entity correctly', async () => {
            const mockProduct = {
                id: 'prod-convert',
                name: 'Conversion Test',
                description: 'Testing conversion',
                price: 123456,
                stock: 42,
                imageUrl: 'https://example.com/convert.jpg',
                createdAt: new Date('2024-01-15T10:30:00Z'),
                updatedAt: new Date('2024-01-16T15:45:00Z'),
            };

            mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

            const result = await repository.findById('prod-convert');

            expect(result.isSuccess).toBe(true);
            const product = result.getValue();
            expect(product.getId()).toBe('prod-convert');
            expect(product.getName()).toBe('Conversion Test');
            expect(product.getDescription()).toBe('Testing conversion');
            expect(product.getPrice().getAmount()).toBe(123456);
            expect(product.getStock()).toBe(42);
            expect(product.getImageUrl()).toBe('https://example.com/convert.jpg');
        });

        it('should handle numeric string prices', async () => {
            const mockProduct = {
                id: 'prod-string-price',
                name: 'String Price',
                description: 'Price as string',
                price: '999999',
                stock: 1,
                imageUrl: 'https://example.com/string.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

            const result = await repository.findById('prod-string-price');

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getPrice().getAmount()).toBe(999999);
        });
    });
});
