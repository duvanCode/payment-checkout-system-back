import { Injectable } from '@nestjs/common';
import { CustomerRepositoryPort } from '../../application/ports/customer.repository.port';
import { Customer } from '../../domain/entities/customer.entity';
import { Result } from '../../shared/result';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepositoryPort {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string): Promise<Result<Customer>> {
        try {
            const customer = await this.prisma.customer.findUnique({
                where: { id },
            });

            if (!customer) {
                return Result.fail('Customer not found');
            }

            return Result.ok(this.toDomain(customer));
        } catch (error) {
            return Result.fail(`Error finding customer: ${error.message}`);
        }
    }

    async findByEmail(email: string): Promise<Result<Customer>> {
        try {
            const customer = await this.prisma.customer.findUnique({
                where: { email },
            });

            if (!customer) {
                return Result.fail('Customer not found');
            }

            return Result.ok(this.toDomain(customer));
        } catch (error) {
            return Result.fail(`Error finding customer: ${error.message}`);
        }
    }

    async save(customer: Customer): Promise<Result<Customer>> {
        try {
            const created = await this.prisma.customer.create({
                data: {
                    email: customer.getEmail(),
                    phone: customer.getPhone(),
                    fullName: customer.getFullName(),
                },
            });

            return Result.ok(this.toDomain(created));
        } catch (error) {
            return Result.fail(`Error saving customer: ${error.message}`);
        }
    }

    async update(customer: Customer): Promise<Result<Customer>> {
        try {
            const updated = await this.prisma.customer.update({
                where: { id: customer.getId() },
                data: {
                    email: customer.getEmail(),
                    phone: customer.getPhone(),
                    fullName: customer.getFullName(),
                    updatedAt: new Date(),
                },
            });

            return Result.ok(this.toDomain(updated));
        } catch (error) {
            return Result.fail(`Error updating customer: ${error.message}`);
        }
    }

    private toDomain(raw: any): Customer {
        return new Customer(
            raw.id,
            raw.email,
            raw.phone,
            raw.fullName,
            raw.createdAt,
            raw.updatedAt,
        );
    }
}