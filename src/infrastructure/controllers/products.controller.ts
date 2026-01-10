import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';

@Controller('api/products')
export class ProductsController {
    constructor(private readonly getProductsUseCase: GetProductsUseCase) { }

    @Get()
    async getProducts() {
        const result = await this.getProductsUseCase.execute();

        if (result.isFailure) {
            throw new HttpException(
                {
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: result.getError(),
                    error: 'ProductsError',
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return {
            statusCode: HttpStatus.OK,
            message: 'Products retrieved successfully',
            data: result.getValue(),
        };
    }
}