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

    // Token de tarjeta (generado en el frontend)
    @IsString()
    @IsNotEmpty()
    @Matches(/^tok_(test|prod|stagtest)_\d+_[a-zA-Z0-9]+$/, {
        message: 'Invalid card token format'
    })
    cardToken: string;

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