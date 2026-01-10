import {
    Controller,
    Post,
    Body,
    HttpStatus,
    HttpException,
    ValidationPipe,
    UsePipes,
} from '@nestjs/common';
import { CalculateSummaryUseCase } from '../../application/use-cases/calculate-summary.use-case';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case';
import { CalculateSummaryDto } from '../../application/dtos/order-summary.dto';
import { PaymentRequestDto } from '../../application/dtos/payment-request.dto';

@Controller('api/payments')
export class PaymentsController {
    constructor(
        private readonly calculateSummaryUseCase: CalculateSummaryUseCase,
        private readonly processPaymentUseCase: ProcessPaymentUseCase,
    ) { }

    @Post('calculate')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async calculateSummary(@Body() dto: CalculateSummaryDto) {
        const result = await this.calculateSummaryUseCase.execute(dto);

        if (result.isFailure) {
            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: result.getError(),
                    error: 'CalculationError',
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        return {
            statusCode: HttpStatus.OK,
            message: 'Order summary calculated successfully',
            data: result.getValue(),
        };
    }

    @Post('process')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async processPayment(@Body() dto: PaymentRequestDto) {
        const result = await this.processPaymentUseCase.execute(dto);

        if (result.isFailure) {
            throw new HttpException(
                {
                    statusCode: HttpStatus.PAYMENT_REQUIRED,
                    message: result.getError(),
                    error: 'PaymentError',
                },
                HttpStatus.PAYMENT_REQUIRED,
            );
        }

        const paymentResult = result.getValue();

        if (!paymentResult.success) {
            return {
                statusCode: HttpStatus.OK,
                message: paymentResult.message,
                data: paymentResult,
            };
        }

        return {
            statusCode: HttpStatus.OK,
            message: 'Payment processed successfully',
            data: paymentResult,
        };
    }
}