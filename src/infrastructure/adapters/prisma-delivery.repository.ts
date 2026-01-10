import { Injectable } from '@nestjs/common';
import { DeliveryRepositoryPort } from '../../application/ports/delivery.repository.port';
import { Delivery } from '../../domain/entities/delivery.entity';
import { Result } from '../../shared/result';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaDeliveryRepository implements DeliveryRepositoryPort {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string): Promise<Result<Delivery>> {
        try {
            const delivery = await this.prisma.delivery.findUnique({
                where: { id },
            });

            if (!delivery) {
                return Result.fail('Delivery not found');
            }

            return Result.ok(this.toDomain(delivery));
        } catch (error) {
            return Result.fail(`Error finding delivery: ${error.message}`);
        }
    }

    async findByTransactionId(transactionId: string): Promise<Result<Delivery>> {
        try {
            const delivery = await this.prisma.delivery.findUnique({
                where: { transactionId },
            });

            if (!delivery) {
                return Result.fail('Delivery not found');
            }

            return Result.ok(this.toDomain(delivery));
        } catch (error) {
            return Result.fail(`Error finding delivery: ${error.message}`);
        }
    }

    async save(delivery: Delivery): Promise<Result<Delivery>> {
        try {
            const data = delivery.toJSON();

            const created = await this.prisma.delivery.create({
                data: {
                    transactionId: data.transactionId,
                    address: data.address,
                    city: data.city,
                    department: data.department,
                    trackingNumber: data.trackingNumber,
                    estimatedDeliveryDate: data.estimatedDeliveryDate,
                },
            });

            return Result.ok(this.toDomain(created));
        } catch (error) {
            return Result.fail(`Error saving delivery: ${error.message}`);
        }
    }

    async update(delivery: Delivery): Promise<Result<Delivery>> {
        try {
            const data = delivery.toJSON();

            const updated = await this.prisma.delivery.update({
                where: { id: delivery.getId() },
                data: {
                    address: data.address,
                    city: data.city,
                    department: data.department,
                    trackingNumber: data.trackingNumber,
                    estimatedDeliveryDate: data.estimatedDeliveryDate,
                    updatedAt: new Date(),
                },
            });

            return Result.ok(this.toDomain(updated));
        } catch (error) {
            return Result.fail(`Error updating delivery: ${error.message}`);
        }
    }

    private toDomain(raw: any): Delivery {
        return new Delivery(
            raw.id,
            raw.transactionId,
            raw.address,
            raw.city,
            raw.department,
            raw.trackingNumber,
            raw.estimatedDeliveryDate,
            raw.createdAt,
            raw.updatedAt,
        );
    }
}