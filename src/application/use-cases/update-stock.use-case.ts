import { Injectable, Inject } from '@nestjs/common';
import { type ProductRepositoryPort, PRODUCT_REPOSITORY } from '../ports/product.repository.port';
import { Result } from '../../shared/result';
import { InsufficientStockException } from '../../shared/exceptions/insufficient-stock.exception';

@Injectable()
export class UpdateStockUseCase {
    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: ProductRepositoryPort,
    ) { }

    async execute(productId: string, quantity: number): Promise<Result<void>> {
        // Buscar producto
        const productResult = await this.productRepository.findById(productId);
        if (productResult.isFailure) {
            return Result.fail('Product not found');
        }

        const product = productResult.getValue();

        // Validar stock disponible
        if (!product.hasStock(quantity)) {
            throw new InsufficientStockException(product.getStock(), quantity);
        }

        // Reducir stock
        product.reduceStock(quantity);

        // Actualizar en DB
        const updateResult = await this.productRepository.update(product);
        if (updateResult.isFailure) {
            return Result.fail(`Failed to update stock: ${updateResult.getError()}`);
        }

        return Result.ok();
    }
}