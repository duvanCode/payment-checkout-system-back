import { ApiProperty } from '@nestjs/swagger';

export class ServiceTransactionData {
    @ApiProperty({ example: '123456-1700000000-12345' })
    id: string;

    @ApiProperty({ example: 999900 })
    amount_in_cents: number;

    @ApiProperty({ example: 'TXN-1700000000000' })
    reference: string;

    @ApiProperty({ example: 'customer@example.com' })
    customer_email: string;

    @ApiProperty({ example: 'COP' })
    currency: string;

    @ApiProperty({ example: 'CARD' })
    payment_method_type: string;

    @ApiProperty({ example: 'APPROVED' })
    status: string;

    @ApiProperty({ example: 'APPROVED' })
    status_message: string;

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    created_at: string;
}

export class ServiceWebhookDto {
    @ApiProperty({ example: 'transaction.updated' })
    event: string;

    @ApiProperty({ type: () => Object })
    data: {
        transaction: ServiceTransactionData;
    };

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    sent_at: string;

    @ApiProperty({ example: 1700000000 })
    timestamp: number;

    @ApiProperty({ type: () => Object })
    signature: {
        checksum: string;
        properties: string[];
    };

    @ApiProperty({ example: 'test' })
    environment: string;
}