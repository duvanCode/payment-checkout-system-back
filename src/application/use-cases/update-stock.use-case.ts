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
        console.log('🔧 [UPDATE STOCK USE CASE] Starting stock update');
        console.log('🔧 [UPDATE STOCK USE CASE] ProductID:', productId);
        console.log('🔧 [UPDATE STOCK USE CASE] Quantity to reduce:', quantity);

        // Buscar producto
        const productResult = await this.productRepository.findById(productId);
        if (productResult.isFailure) {
            console.error('❌ [UPDATE STOCK USE CASE] Product not found');
            return Result.fail('Product not found');
        }

        const product = productResult.getValue();
        console.log('🔧 [UPDATE STOCK USE CASE] Product found:', product.getName());
        console.log('🔧 [UPDATE STOCK USE CASE] Current stock:', product.getStock());

        // Validar stock disponible
        if (!product.hasStock(quantity)) {
            console.error('❌ [UPDATE STOCK USE CASE] Insufficient stock');
            throw new InsufficientStockException(product.getStock(), quantity);
        }

        // Reducir stock
        console.log('🔧 [UPDATE STOCK USE CASE] Reducing stock by', quantity);
        product.reduceStock(quantity);
        console.log('🔧 [UPDATE STOCK USE CASE] New stock value:', product.getStock());

        // Actualizar en DB
        console.log('🔧 [UPDATE STOCK USE CASE] Updating product in database');
        const updateResult = await this.productRepository.update(product);
        if (updateResult.isFailure) {
            console.error('❌ [UPDATE STOCK USE CASE] Database update failed:', updateResult.getError());
            return Result.fail(`Failed to update stock: ${updateResult.getError()}`);
        }

        console.log('✅ [UPDATE STOCK USE CASE] Stock updated successfully in database');
        return Result.ok();
    }
}