import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { ProductListResponseDto } from '../../application/dtos/product-list.dto';

@ApiTags('Products')
@Controller('api/products')
export class ProductsController {
    constructor(private readonly getProductsUseCase: GetProductsUseCase) { }

    @Get()
    @ApiOperation({ summary: 'Get all available products' })
    @ApiResponse({
        status: 200,
        description: 'Products retrieved successfully',
        type: ProductListResponseDto
    })
    @ApiResponse({ status: 500, description: 'Internal server error' })
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