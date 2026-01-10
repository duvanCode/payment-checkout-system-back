import { Injectable, Inject } from '@nestjs/common';
import { type ProductRepositoryPort, PRODUCT_REPOSITORY } from '../ports/product.repository.port';
import { CalculateSummaryDto, OrderSummaryDto } from '../dtos/order-summary.dto';
import { Result } from '../../shared/result';
import { FEES, getDeliveryFee } from '../../shared/constants/fees.constants';

@Injectable()
export class CalculateSummaryUseCase {
    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: ProductRepositoryPort,
    ) { }

    async execute(dto: CalculateSummaryDto): Promise<Result<OrderSummaryDto>> {
        // Validar que la cantidad sea positiva
        if (dto.quantity <= 0) {
            return Result.fail('Quantity must be greater than 0');
        }

        // Buscar producto
        const productResult = await this.productRepository.findById(dto.productId);
        if (productResult.isFailure) {
            return Result.fail('Product not found');
        }

        const product = productResult.getValue();

        // Validar stock disponible
        if (!product.hasStock(dto.quantity)) {
            return Result.fail(
                `Insufficient stock. Available: ${product.getStock()}, Requested: ${dto.quantity}`,
            );
        }

        // Calcular totales
        const productPrice = product.getPrice().getAmount();
        const subtotal = productPrice * dto.quantity;
        const baseFee = FEES.BASE_FEE;
        const deliveryFee = getDeliveryFee(dto.deliveryCity);
        const total = subtotal + baseFee + deliveryFee;

        const summary: OrderSummaryDto = {
            productId: product.getId(),
            productName: product.getName(),
            productPrice,
            quantity: dto.quantity,
            subtotal,
            baseFee,
            deliveryFee,
            total,
            deliveryCity: dto.deliveryCity,
        };

        return Result.ok(summary);
    }
}