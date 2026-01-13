import { Injectable, Inject } from '@nestjs/common';
import { type ProductRepositoryPort, PRODUCT_REPOSITORY } from '../ports/product.repository.port';
import { CalculateSummaryDto, OrderSummaryDto, OrderSummaryItemDto } from '../dtos/order-summary.dto';

import { Result } from '../../shared/result';
import { FEES, getDeliveryFee } from '../../shared/constants/fees.constants';

@Injectable()
export class CalculateSummaryUseCase {
    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: ProductRepositoryPort,
    ) { }

    async execute(dto: CalculateSummaryDto): Promise<Result<OrderSummaryDto>> {
        console.log('🔍 [USE CASE] Starting calculate summary...');
        console.log('🔍 [USE CASE] DTO received:', JSON.stringify(dto, null, 2));
        console.log('🔍 [USE CASE] DTO type:', typeof dto);
        console.log('🔍 [USE CASE] DTO constructor:', dto?.constructor?.name);
        console.log('🔍 [USE CASE] dto.items:', dto.items);
        console.log('🔍 [USE CASE] dto.items type:', typeof dto.items);
        console.log('🔍 [USE CASE] dto.items is Array?:', Array.isArray(dto.items));
        console.log('🔍 [USE CASE] dto.items is null?:', dto.items === null);
        console.log('🔍 [USE CASE] dto.items is undefined?:', dto.items === undefined);
        console.log('🔍 [USE CASE] dto.items length:', dto.items?.length);
        console.log('🔍 [USE CASE] dto.items keys:', dto.items ? Object.keys(dto.items) : 'N/A');

        if (!dto.items) {
            console.error('❌ [USE CASE] ERROR: dto.items is null or undefined');
            return Result.fail('Items array is required');
        }

        if (!Array.isArray(dto.items)) {
            console.error('❌ [USE CASE] ERROR: dto.items is not an array');
            console.error('❌ [USE CASE] Actual type:', typeof dto.items);
            console.error('❌ [USE CASE] Actual value:', dto.items);
            return Result.fail('Items must be an array');
        }

        const orderItems: OrderSummaryItemDto[] = [];
        let subtotal = 0;

        console.log('✅ [USE CASE] Starting to iterate items...');
        for (const itemDto of dto.items) {
            console.log('🔍 [USE CASE] Processing item:', itemDto);
            // Validar que la cantidad sea positiva
            if (itemDto.quantity <= 0) {
                console.error('❌ [USE CASE] Invalid quantity:', itemDto.quantity);
                return Result.fail(`Quantity for product ${itemDto.productId} must be greater than 0`);
            }

            // Buscar producto
            console.log('🔍 [USE CASE] Searching for product:', itemDto.productId);
            const productResult = await this.productRepository.findById(itemDto.productId);
            console.log('🔍 [USE CASE] Product search result - isFailure:', productResult.isFailure);

            if (productResult.isFailure) {
                console.error('❌ [USE CASE] Product not found:', itemDto.productId);
                console.error('❌ [USE CASE] Error:', productResult.getError());
                return Result.fail(`Product ${itemDto.productId} not found`);
            }

            const product = productResult.getValue();
            console.log('✅ [USE CASE] Product found:', product.getId(), product.getName());

            // Validar stock disponible
            if (!product.hasStock(itemDto.quantity)) {
                return Result.fail(
                    `Insufficient stock for ${product.getName()}. Available: ${product.getStock()}, Requested: ${itemDto.quantity}`,
                );
            }

            const productPrice = product.getPrice().getAmount();
            const itemSubtotal = productPrice * itemDto.quantity;
            subtotal += itemSubtotal;

            orderItems.push({
                productId: product.getId(),
                productName: product.getName(),
                productPrice,
                quantity: itemDto.quantity,
                subtotal: itemSubtotal,
            });
        }

        // Calcular totales
        const baseFee = FEES.BASE_FEE;
        const deliveryFee = getDeliveryFee(dto.deliveryCity);
        const total = subtotal + baseFee + deliveryFee;

        const summary: OrderSummaryDto = {
            items: orderItems,
            subtotal,
            fees: {
                base: baseFee,
                delivery: deliveryFee,
            },

            total,
            deliveryCity: dto.deliveryCity,
        };

        return Result.ok(summary);
    }

}