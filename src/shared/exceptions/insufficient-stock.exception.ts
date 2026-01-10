import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientStockException extends HttpException {
    constructor(available: number, requested: number) {
        super(
            {
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Insufficient stock',
                error: 'InsufficientStock',
                details: {
                    available,
                    requested,
                },
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}