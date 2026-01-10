import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { type ProductRepositoryPort, PRODUCT_REPOSITORY } from '../ports/product.repository.port';
import { ProductDto, ProductListResponseDto } from '../dtos/product-list.dto';
import { Result } from '../../shared/result';

@Injectable()
export class GetProductsUseCase {
    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: ProductRepositoryPort,
    ) { }

    async execute(): Promise<Result<ProductListResponseDto>> {
        const productsResult = await this.productRepository.findAllWithStock();

        if (productsResult.isFailure) {
            return Result.fail(productsResult.getError());
        }

        const products = productsResult.getValue();

        const productDtos: ProductDto[] = products.map((product) => ({
            id: product.getId(),
            name: product.getName(),
            description: product.getDescription(),
            price: product.getPrice().getAmount(),
            stock: product.getStock(),
            imageUrl: product.getImageUrl(),
        }));

        return Result.ok({
            products: productDtos,
            total: productDtos.length,
        });
    }
}