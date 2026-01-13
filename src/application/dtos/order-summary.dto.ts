import { IsString, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateSummaryItemDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsString()
    productId: string;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @Min(1)
    quantity: number;
}

export class CalculateSummaryDto {
    @ApiProperty({ type: [CalculateSummaryItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CalculateSummaryItemDto)
    items: CalculateSummaryItemDto[];

    @ApiProperty({ example: 'Bogotá' })
    @IsString()
    deliveryCity: string;
}

export class OrderSummaryItemDto {
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
}

export class OrderSummaryDto {
    @ApiProperty({ type: [OrderSummaryItemDto] })
    items: OrderSummaryItemDto[];

    @ApiProperty({ example: 99.99 })
    subtotal: number;


    @ApiProperty({
        example: {
            base: 2000,
            delivery: 5000
        }
    })
    fees: {
        base: number;
        delivery: number;
    };


    @ApiProperty({ example: 114.99 })
    total: number;

    @ApiProperty({ example: 'Bogotá' })
    deliveryCity: string;
}