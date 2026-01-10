import {
    IsString,
    IsNumber,
    IsEmail,
    IsNotEmpty,
    Min,
    Max,
    Length,
    Matches
} from 'class-validator';

export class PaymentRequestDto {
    // Producto
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    // Información de tarjeta
    @IsString()
    @IsNotEmpty()
    @Length(13, 19)
    @Matches(/^\d+$/, { message: 'Card number must contain only digits' })
    cardNumber: string;

    @IsString()
    @IsNotEmpty()
    @Length(3, 100)
    cardHolderName: string;

    @IsString()
    @Length(2, 2)
    @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Invalid expiration month (01-12)' })
    expirationMonth: string;

    @IsString()
    @Length(2, 2)
    @Matches(/^\d{2}$/, { message: 'Invalid expiration year (YY format)' })
    expirationYear: string;

    @IsString()
    @Length(3, 4)
    @Matches(/^\d{3,4}$/, { message: 'CVV must be 3 or 4 digits' })
    cvv: string;

    // Información de entrega
    @IsEmail()
    @IsNotEmpty()
    customerEmail: string;

    @IsString()
    @IsNotEmpty()
    @Length(7, 20)
    customerPhone: string;

    @IsString()
    @IsNotEmpty()
    customerFullName: string;

    @IsString()
    @IsNotEmpty()
    @Length(10, 200)
    deliveryAddress: string;

    @IsString()
    @IsNotEmpty()
    deliveryCity: string;

    @IsString()
    @IsNotEmpty()
    deliveryDepartment: string;
}