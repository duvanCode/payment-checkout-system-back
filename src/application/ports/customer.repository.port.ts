import { Customer } from '../../domain/entities/customer.entity';
import { Result } from '../../shared/result';

export interface CustomerRepositoryPort {
    findById(id: string): Promise<Result<Customer>>;
    findByEmail(email: string): Promise<Result<Customer>>;
    save(customer: Customer): Promise<Result<Customer>>;
    update(customer: Customer): Promise<Result<Customer>>;
}

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');