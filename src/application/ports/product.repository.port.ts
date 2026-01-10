import { Product } from '../../domain/entities/product.entity';
import { Result } from '../../shared/result';

export interface ProductRepositoryPort {
    findById(id: string): Promise<Result<Product>>;
    findAll(): Promise<Result<Product[]>>;
    findAllWithStock(): Promise<Result<Product[]>>;
    save(product: Product): Promise<Result<Product>>;
    update(product: Product): Promise<Result<Product>>;
    updateStock(id: string, quantity: number): Promise<Result<Product>>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');