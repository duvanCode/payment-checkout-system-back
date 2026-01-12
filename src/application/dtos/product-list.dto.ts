import { IsString, IsNumber, IsUrl, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsString()
    id: string;

    @ApiProperty({ example: 'Product Name' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'Product Description' })
    @IsString()
    description: string;

    @ApiProperty({ example: 99.99 })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({ example: 100 })
    @IsNumber()
    @Min(0)
    stock: number;

    @ApiProperty({ example: 'https://example.com/image.jpg' })
    @IsUrl()
    imageUrl: string;
}

export class ProductListResponseDto {
    @ApiProperty({ type: [ProductDto] })
    products: ProductDto[];

    @ApiProperty({ example: 1 })
    total: number;
}