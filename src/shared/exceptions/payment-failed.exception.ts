import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentFailedException extends HttpException {
    constructor(reason: string, details?: any) {
        super(
            {
                statusCode: HttpStatus.PAYMENT_REQUIRED,
                message: 'Payment failed',
                error: 'PaymentFailed',
                reason,
                details,
            },
            HttpStatus.PAYMENT_REQUIRED,
        );
    }
}