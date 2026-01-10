import { IsString, IsNumber, IsUrl, Min } from 'class-validator';

export class ProductDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @Min(0)
    stock: number;

    @IsUrl()
    imageUrl: string;
}

export class ProductListResponseDto {
    products: ProductDto[];
    total: number;
}