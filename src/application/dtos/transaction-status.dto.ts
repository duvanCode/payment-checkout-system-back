import { IsString, IsNotEmpty } from 'class-validator';

export class GetTransactionStatusDto {
    @IsString()
    @IsNotEmpty()
    transactionNumber: string;
}
