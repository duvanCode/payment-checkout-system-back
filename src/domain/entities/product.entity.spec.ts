import { Product } from './product.entity';
import { Money } from '../value-objects/money.vo';

describe('Product Entity', () => {
    let sampleProduct: Product;
    const mockDate = new Date('2024-01-01');

    beforeEach(() => {
        sampleProduct = new Product(
            'prod-123',
            'Gaming Laptop',
            'High-performance laptop for gaming',
            Money.from(1500000, 'COP'),
            10,
            'https://example.com/laptop.jpg',
            mockDate,
            mockDate,
        );
    });

    describe('constructor', () => {
        it('should create a product with all properties', () => {
            expect(sampleProduct.getId()).toBe('prod-123');
            expect(sampleProduct.getName()).toBe('Gaming Laptop');
            expect(sampleProduct.getDescription()).toBe('High-performance laptop for gaming');
            expect(sampleProduct.getPrice().getAmount()).toBe(1500000);
            expect(sampleProduct.getStock()).toBe(10);
            expect(sampleProduct.getImageUrl()).toBe('https://example.com/laptop.jpg');
        });
    });

    describe('hasStock', () => {
        it('should return true when requested quantity is available', () => {
            expect(sampleProduct.hasStock(5)).toBe(true);
        });

        it('should return true when requested quantity equals stock', () => {
            expect(sampleProduct.hasStock(10)).toBe(true);
        });

        it('should return false when requested quantity exceeds stock', () => {
            expect(sampleProduct.hasStock(15)).toBe(false);
        });

        it('should return true for zero quantity', () => {
            expect(sampleProduct.hasStock(0)).toBe(true);
        });
    });

    describe('reduceStock', () => {
        it('should reduce stock by specified quantity', () => {
            sampleProduct.reduceStock(3);

            expect(sampleProduct.getStock()).toBe(7);
        });

        it('should reduce stock to zero when reducing all stock', () => {
            sampleProduct.reduceStock(10);

            expect(sampleProduct.getStock()).toBe(0);
        });

        it('should throw error when trying to reduce more stock than available', () => {
            expect(() => sampleProduct.reduceStock(15)).toThrow(
                'Insufficient stock. Available: 10, Requested: 15',
            );
        });

        it('should not reduce stock when error is thrown', () => {
            try {
                sampleProduct.reduceStock(15);
            } catch (error) {
                expect(sampleProduct.getStock()).toBe(10);
            }
        });

        it('should allow reducing stock by 1', () => {
            sampleProduct.reduceStock(1);

            expect(sampleProduct.getStock()).toBe(9);
        });

        it('should handle multiple stock reductions', () => {
            sampleProduct.reduceStock(2);
            sampleProduct.reduceStock(3);
            sampleProduct.reduceStock(1);

            expect(sampleProduct.getStock()).toBe(4);
        });
    });

    describe('increaseStock', () => {
        it('should increase stock by specified quantity', () => {
            sampleProduct.increaseStock(5);

            expect(sampleProduct.getStock()).toBe(15);
        });

        it('should increase stock from zero', () => {
            const emptyProduct = new Product(
                'prod-empty',
                'Empty Product',
                'No stock',
                Money.from(100000, 'COP'),
                0,
                'https://example.com/empty.jpg',
                mockDate,
                mockDate,
            );

            emptyProduct.increaseStock(10);

            expect(emptyProduct.getStock()).toBe(10);
        });

        it('should handle multiple stock increases', () => {
            sampleProduct.increaseStock(5);
            sampleProduct.increaseStock(3);

            expect(sampleProduct.getStock()).toBe(18);
        });

        it('should increase stock by 1', () => {
            sampleProduct.increaseStock(1);

            expect(sampleProduct.getStock()).toBe(11);
        });
    });

    describe('stock management workflow', () => {
        it('should handle reduce and increase operations together', () => {
            sampleProduct.reduceStock(5); // 10 - 5 = 5
            sampleProduct.increaseStock(3); // 5 + 3 = 8
            sampleProduct.reduceStock(2); // 8 - 2 = 6

            expect(sampleProduct.getStock()).toBe(6);
        });

        it('should maintain stock consistency after failed reduction', () => {
            expect(() => sampleProduct.reduceStock(15)).toThrow();
            sampleProduct.increaseStock(5);

            expect(sampleProduct.getStock()).toBe(15);
        });
    });

    describe('toJSON', () => {
        it('should serialize product to JSON', () => {
            const json = sampleProduct.toJSON();

            expect(json).toEqual({
                id: 'prod-123',
                name: 'Gaming Laptop',
                description: 'High-performance laptop for gaming',
                price: 1500000,
                stock: 10,
                imageUrl: 'https://example.com/laptop.jpg',
                createdAt: mockDate,
                updatedAt: mockDate,
            });
        });

        it('should serialize product with updated stock', () => {
            sampleProduct.reduceStock(3);
            const json = sampleProduct.toJSON();

            expect(json.stock).toBe(7);
        });
    });

    describe('edge cases', () => {
        it('should handle product with zero stock', () => {
            const product = new Product(
                'prod-zero',
                'Out of Stock Product',
                'Currently unavailable',
                Money.from(50000, 'COP'),
                0,
                'https://example.com/out.jpg',
                mockDate,
                mockDate,
            );

            expect(product.getStock()).toBe(0);
            expect(product.hasStock(1)).toBe(false);
        });

        it('should handle product with large stock quantity', () => {
            const product = new Product(
                'prod-bulk',
                'Bulk Product',
                'Large inventory',
                Money.from(1000, 'COP'),
                1000000,
                'https://example.com/bulk.jpg',
                mockDate,
                mockDate,
            );

            expect(product.getStock()).toBe(1000000);
            expect(product.hasStock(500000)).toBe(true);
        });
    });
});
