import { ApiProperty } from '@nestjs/swagger';

export class PaymentResultDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: 'TXN-1700000000000' })
    transactionNumber: string;

    @ApiProperty({ example: 'APPROVED' })
    status: string;

    @ApiProperty({ example: 'Transaction was successful' })
    message: string;

    @ApiProperty({
        required: false,
        example: {
            trackingNumber: 'TRK-123456789',
            estimatedDeliveryDate: '2024-12-31T23:59:59.999Z',
            address: 'Calle 123 # 45-67',
            city: 'Bogotá'
        }
    })
    delivery?: {
        trackingNumber: string;
        estimatedDeliveryDate: Date;
        address: string;
        city: string;
    };

    @ApiProperty({
        required: false,
        example: {
            code: 'INSUFFICIENT_FUNDS',
            message: 'Target card has insufficient funds'
        }
    })
    error?: {
        code: string;
        message: string;
        details?: any;
    };

    @ApiProperty({
        required: false,
        example: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Product Name',
            updatedStock: 99
        }
    })
    product?: {
        id: string;
        name: string;
        updatedStock: number;
    };

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ required: false, example: '2024-01-01T00:00:10.000Z' })
    processedAt?: Date;
}