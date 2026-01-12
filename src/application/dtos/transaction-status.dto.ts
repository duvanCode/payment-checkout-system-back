import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetTransactionStatusDto {
    @ApiProperty({ example: 'TXN-1700000000000' })
    @IsString()
    @IsNotEmpty()
    transactionNumber: string;
}
