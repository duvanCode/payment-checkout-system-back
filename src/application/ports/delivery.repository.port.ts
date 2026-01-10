import { Delivery } from '../../domain/entities/delivery.entity';
import { Result } from '../../shared/result';

export interface DeliveryRepositoryPort {
    findById(id: string): Promise<Result<Delivery>>;
    findByTransactionId(transactionId: string): Promise<Result<Delivery>>;
    save(delivery: Delivery): Promise<Result<Delivery>>;
    update(delivery: Delivery): Promise<Result<Delivery>>;
}

export const DELIVERY_REPOSITORY = Symbol('DELIVERY_REPOSITORY');