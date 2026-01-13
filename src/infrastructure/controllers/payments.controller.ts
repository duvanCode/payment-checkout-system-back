import {
    Controller,
    Post,
    Body,
    HttpStatus,
    HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CalculateSummaryUseCase } from '../../application/use-cases/calculate-summary.use-case';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case';
import { GetTransactionStatusUseCase } from '../../application/use-cases/get-transaction-status.use-case';
import { CalculateSummaryDto, OrderSummaryDto } from '../../application/dtos/order-summary.dto';
import { PaymentRequestDto } from '../../application/dtos/payment-request.dto';
import { PaymentResultDto } from '../../application/dtos/payment-result.dto';
import { GetTransactionStatusDto } from '../../application/dtos/transaction-status.dto';
import { TransactionResponseDto } from '../../application/dtos/transaction-response.dto';

@ApiTags('Payments')
@Controller('api/payments')
export class PaymentsController {
    constructor(
        private readonly calculateSummaryUseCase: CalculateSummaryUseCase,
        private readonly processPaymentUseCase: ProcessPaymentUseCase,
        private readonly getTransactionStatusUseCase: GetTransactionStatusUseCase,
    ) { }

    @Post('calculate')
    @ApiOperation({ summary: 'Calculate order summary including fees' })
    @ApiResponse({
        status: 200,
        description: 'Order summary calculated successfully',
        type: OrderSummaryDto
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async calculateSummary(@Body() dto: CalculateSummaryDto) {
        console.log('DTO received:', JSON.stringify(dto, null, 2));
        console.log('DTO type:', dto.constructor.name);
        console.log('Items:', dto.items);
        console.log('Items type:', typeof dto.items);
        console.log('Items isArray:', Array.isArray(dto.items));
        console.log('Items length:', dto.items?.length);

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
    @ApiOperation({ summary: 'Process a payment transaction' })
    @ApiResponse({
        status: 200,
        description: 'Payment processed successfully',
        type: PaymentResultDto
    })
    @ApiResponse({ status: 402, description: 'Payment failed' })
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

    @Post('status')
    @ApiOperation({ summary: 'Get the status of a transaction' })
    @ApiResponse({
        status: 200,
        description: 'Transaction status retrieved successfully',
        type: TransactionResponseDto
    })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    async getTransactionStatus(@Body() dto: GetTransactionStatusDto) {
        const result = await this.getTransactionStatusUseCase.execute(dto.transactionNumber);

        if (result.isFailure) {
            throw new HttpException(
                {
                    statusCode: HttpStatus.NOT_FOUND,
                    message: result.getError(),
                    error: 'TransactionNotFound',
                },
                HttpStatus.NOT_FOUND,
            );
        }

        return {
            statusCode: HttpStatus.OK,
            message: 'Transaction status retrieved successfully',
            data: result.getValue(),
        };
    }
}
