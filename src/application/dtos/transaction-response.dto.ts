export class TransactionResponseDto {
    transactionNumber: string;
    status: string;
    productId: string;
    productName: string;
    quantity: number;
    subtotal: number;
    baseFee: number;
    deliveryFee: number;
    total: number;
    createdAt: Date;
}