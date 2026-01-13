import { ApiProperty } from '@nestjs/swagger';

export class TransactionResponseDto {
    @ApiProperty({ example: 'TXN-1700000000000' })
    transactionNumber: string;

    @ApiProperty({ example: 'APPROVED' })
    status: string;

    @ApiProperty({
        example: [
            { productId: 'p1', productName: 'Prod 1', quantity: 2, price: 50000, subtotal: 100000 }
        ]
    })
    items: any[];

    @ApiProperty({ example: 100000 })
    subtotal: number;

    @ApiProperty({ example: 2000 })
    baseFee: number;

    @ApiProperty({ example: 5000 })
    deliveryFee: number;

    @ApiProperty({ example: 107000 })
    total: number;


    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    createdAt: Date;
}