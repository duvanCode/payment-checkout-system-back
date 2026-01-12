import { ProductsController } from './products.controller';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { Result } from '../../shared/result';
import { HttpStatus, HttpException } from '@nestjs/common';

describe('ProductsController', () => {
    let controller: ProductsController;
    let mockGetProductsUseCase: jest.Mocked<GetProductsUseCase>;

    beforeEach(() => {
        mockGetProductsUseCase = {
            execute: jest.fn(),
        } as any;

        controller = new ProductsController(mockGetProductsUseCase);
    });

    describe('getProducts', () => {
        it('should return a list of products successfully', async () => {
            const mockProducts = [
                {
                    id: 'prod-1',
                    name: 'Product 1',
                    price: 100,
                    stock: 10,
                },
                {
                    id: 'prod-2',
                    name: 'Product 2',
                    price: 200,
                    stock: 5,
                },
            ];

            mockGetProductsUseCase.execute.mockResolvedValue(Result.ok(mockProducts));

            const result = await controller.getProducts();

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Products retrieved successfully',
                data: mockProducts,
            });
            expect(mockGetProductsUseCase.execute).toHaveBeenCalled();
        });

        it('should return an empty list when no products found', async () => {
            mockGetProductsUseCase.execute.mockResolvedValue(Result.ok([]));

            const result = await controller.getProducts();

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Products retrieved successfully',
                data: [],
            });
        });

        it('should throw HttpException when use case fails', async () => {
            mockGetProductsUseCase.execute.mockResolvedValue(Result.fail('Database error'));

            await expect(controller.getProducts()).rejects.toThrow(HttpException);

            try {
                await controller.getProducts();
            } catch (error) {
                expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
                expect(error.getResponse()).toEqual({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Database error',
                    error: 'ProductsError',
                });
            }
        });
    });
});
