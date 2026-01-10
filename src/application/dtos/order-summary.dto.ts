import { IsString, IsNumber, Min } from 'class-validator';

export class CalculateSummaryDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsString()
    deliveryCity: string;
}

export class OrderSummaryDto {
    productId: string;
    productName: string;
    productPrice: number;
    quantity: number;
    subtotal: number;
    baseFee: number;
    deliveryFee: number;
    total: number;
    deliveryCity: string;
}