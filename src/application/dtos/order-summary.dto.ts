import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateSummaryDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsString()
    productId: string;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiProperty({ example: 'Bogotá' })
    @IsString()
    deliveryCity: string;
}

export class OrderSummaryDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    productId: string;

    @ApiProperty({ example: 'Product Name' })
    productName: string;

    @ApiProperty({ example: 99.99 })
    productPrice: number;

    @ApiProperty({ example: 1 })
    quantity: number;

    @ApiProperty({ example: 99.99 })
    subtotal: number;

    @ApiProperty({ example: 5.00 })
    baseFee: number;

    @ApiProperty({ example: 10.00 })
    deliveryFee: number;

    @ApiProperty({ example: 114.99 })
    total: number;

    @ApiProperty({ example: 'Bogotá' })
    deliveryCity: string;
}