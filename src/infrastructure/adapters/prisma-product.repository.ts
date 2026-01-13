import { Injectable } from '@nestjs/common';
import { ProductRepositoryPort } from '../../application/ports/product.repository.port';
import { Product } from '../../domain/entities/product.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { Result } from '../../shared/result';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaProductRepository implements ProductRepositoryPort {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string): Promise<Result<Product>> {
        try {
            console.log('🔍 [REPOSITORY] Searching product with ID:', id);
            console.log('🔍 [REPOSITORY] ID type:', typeof id);
            console.log('🔍 [REPOSITORY] ID length:', id.length);

            const product = await this.prisma.product.findUnique({
                where: { id },
            });

            console.log('🔍 [REPOSITORY] Prisma result:', product ? 'FOUND' : 'NOT FOUND');
            if (product) {
                console.log('🔍 [REPOSITORY] Product data:', {
                    id: product.id,
                    name: product.name,
                    stock: product.stock
                });
            }

            if (!product) {
                console.error('❌ [REPOSITORY] Product not found with ID:', id);
                return Result.fail('Product not found');
            }

            return Result.ok(this.toDomain(product));
        } catch (error) {
            console.error('❌ [REPOSITORY] Error finding product:', error.message);
            console.error('❌ [REPOSITORY] Error stack:', error.stack);
            return Result.fail(`Error finding product: ${error.message}`);
        }
    }

    async findAll(): Promise<Result<Product[]>> {
        try {
            const products = await this.prisma.product.findMany({
                orderBy: { createdAt: 'desc' },
            });

            return Result.ok(products.map(this.toDomain));
        } catch (error) {
            return Result.fail(`Error finding products: ${error.message}`);
        }
    }

    async findAllWithStock(): Promise<Result<Product[]>> {
        try {
            const products = await this.prisma.product.findMany({
                where: { stock: { gt: 0 } },
                orderBy: { createdAt: 'desc' },
            });

            return Result.ok(products.map(this.toDomain));
        } catch (error) {
            return Result.fail(`Error finding products with stock: ${error.message}`);
        }
    }

    async save(product: Product): Promise<Result<Product>> {
        try {
            const created = await this.prisma.product.create({
                data: {
                    name: product.getName(),
                    description: product.getDescription(),
                    price: product.getPrice().getAmount(),
                    stock: product.getStock(),
                    imageUrl: product.getImageUrl(),
                },
            });

            return Result.ok(this.toDomain(created));
        } catch (error) {
            return Result.fail(`Error saving product: ${error.message}`);
        }
    }

    async update(product: Product): Promise<Result<Product>> {
        try {
            const updated = await this.prisma.product.update({
                where: { id: product.getId() },
                data: {
                    name: product.getName(),
                    description: product.getDescription(),
                    price: product.getPrice().getAmount(),
                    stock: product.getStock(),
                    imageUrl: product.getImageUrl(),
                    updatedAt: new Date(),
                },
            });

            return Result.ok(this.toDomain(updated));
        } catch (error) {
            return Result.fail(`Error updating product: ${error.message}`);
        }
    }

    async updateStock(id: string, newStock: number): Promise<Result<Product>> {
        try {
            const updated = await this.prisma.product.update({
                where: { id },
                data: {
                    stock: newStock,
                    updatedAt: new Date(),
                },
            });

            return Result.ok(this.toDomain(updated));
        } catch (error) {
            return Result.fail(`Error updating stock: ${error.message}`);
        }
    }

    private toDomain(raw: any): Product {
        return new Product(
            raw.id,
            raw.name,
            raw.description,
            Money.from(Number(raw.price)),
            raw.stock,
            raw.imageUrl,
            raw.createdAt,
            raw.updatedAt,
        );
    }
}