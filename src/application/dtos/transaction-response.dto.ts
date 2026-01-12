import { ApiProperty } from '@nestjs/swagger';

export class TransactionResponseDto {
    @ApiProperty({ example: 'TXN-1700000000000' })
    transactionNumber: string;

    @ApiProperty({ example: 'APPROVED' })
    status: string;

    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    productId: string;

    @ApiProperty({ example: 'Product Name' })
    productName: string;

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

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    createdAt: Date;
}