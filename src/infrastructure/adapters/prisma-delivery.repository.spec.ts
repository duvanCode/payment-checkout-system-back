import { PrismaDeliveryRepository } from './prisma-delivery.repository';
import { PrismaService } from '../database/prisma.service';
import { Delivery } from '../../domain/entities/delivery.entity';

describe('PrismaDeliveryRepository', () => {
    let repository: PrismaDeliveryRepository;
    let mockPrismaService: jest.Mocked<PrismaService>;

    beforeEach(() => {
        mockPrismaService = {
            delivery: {
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        } as any;

        repository = new PrismaDeliveryRepository(mockPrismaService);
    });

    describe('findById', () => {
        it('should return delivery when found', async () => {
            const mockDelivery = {
                id: 'del-123',
                transactionId: 'trans-456',
                address: 'Calle 123 #45-67',
                city: 'Bogotá',
                department: 'Cundinamarca',
                trackingNumber: 'TRACK-1234567890',
                estimatedDeliveryDate: new Date('2024-01-10'),
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };

            mockPrismaService.delivery.findUnique.mockResolvedValue(mockDelivery);

            const result = await repository.findById('del-123');

            expect(result.isSuccess).toBe(true);
            const delivery = result.getValue();
            expect(delivery.getId()).toBe('del-123');
            const json = delivery.toJSON();
            expect(json.address).toBe('Calle 123 #45-67');
            expect(json.city).toBe('Bogotá');
            expect(json.department).toBe('Cundinamarca');
        });

        it('should return failure when delivery not found', async () => {
            mockPrismaService.delivery.findUnique.mockResolvedValue(null);

            const result = await repository.findById('nonexistent');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Delivery not found');
        });

        it('should handle database errors', async () => {
            mockPrismaService.delivery.findUnique.mockRejectedValue(
                new Error('Database connection error'),
            );

            const result = await repository.findById('del-123');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error finding delivery');
        });

        it('should call findUnique with correct parameters', async () => {
            const mockDelivery = {
                id: 'del-789',
                transactionId: 'trans-999',
                address: 'Avenida 1 #2-3',
                city: 'Medellín',
                department: 'Antioquia',
                trackingNumber: 'TRACK-9876543210',
                estimatedDeliveryDate: new Date('2024-01-15'),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.findUnique.mockResolvedValue(mockDelivery);

            await repository.findById('del-789');

            expect(mockPrismaService.delivery.findUnique).toHaveBeenCalledWith({
                where: { id: 'del-789' },
            });
        });
    });

    describe('findByTransactionId', () => {
        it('should return delivery when found by transaction ID', async () => {
            const mockDelivery = {
                id: 'del-search',
                transactionId: 'trans-search-123',
                address: 'Carrera 10 #20-30',
                city: 'Cali',
                department: 'Valle del Cauca',
                trackingNumber: 'TRACK-SEARCH-001',
                estimatedDeliveryDate: new Date('2024-01-20'),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.findUnique.mockResolvedValue(mockDelivery);

            const result = await repository.findByTransactionId('trans-search-123');

            expect(result.isSuccess).toBe(true);
            const json = result.getValue().toJSON();
            expect(json.transactionId).toBe('trans-search-123');
        });

        it('should return failure when delivery not found by transaction ID', async () => {
            mockPrismaService.delivery.findUnique.mockResolvedValue(null);

            const result = await repository.findByTransactionId('trans-notfound');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Delivery not found');
        });

        it('should call findUnique with transactionId where clause', async () => {
            const mockDelivery = {
                id: 'del-test',
                transactionId: 'trans-test-456',
                address: 'Diagonal 15 #8-9',
                city: 'Barranquilla',
                department: 'Atlántico',
                trackingNumber: 'TRACK-TEST-002',
                estimatedDeliveryDate: new Date('2024-01-25'),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.findUnique.mockResolvedValue(mockDelivery);

            await repository.findByTransactionId('trans-test-456');

            expect(mockPrismaService.delivery.findUnique).toHaveBeenCalledWith({
                where: { transactionId: 'trans-test-456' },
            });
        });

        it('should handle database errors', async () => {
            mockPrismaService.delivery.findUnique.mockRejectedValue(new Error('Query timeout'));

            const result = await repository.findByTransactionId('trans-error');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error finding delivery');
        });
    });

    describe('save', () => {
        it('should save new delivery successfully', async () => {
            const trackingNumber = Delivery.generateTrackingNumber();
            const estimatedDate = Delivery.calculateEstimatedDelivery('Bogotá');
            const delivery = new Delivery(
                undefined,
                'trans-new-123',
                'Calle Nueva #1-2',
                'Bogotá',
                'Cundinamarca',
                trackingNumber,
                estimatedDate,
                new Date(),
                new Date(),
            );

            const mockCreated = {
                id: 'del-created',
                transactionId: 'trans-new-123',
                address: 'Calle Nueva #1-2',
                city: 'Bogotá',
                department: 'Cundinamarca',
                trackingNumber: delivery.getTrackingNumber(),
                estimatedDeliveryDate: delivery.getEstimatedDeliveryDate(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.create.mockResolvedValue(mockCreated);

            const result = await repository.save(delivery);

            expect(result.isSuccess).toBe(true);
            const json = result.getValue().toJSON();
            expect(json.address).toBe('Calle Nueva #1-2');
        });

        it('should call create with correct data', async () => {
            const trackingNumber = Delivery.generateTrackingNumber();
            const estimatedDate = Delivery.calculateEstimatedDelivery('Medellín');
            const delivery = new Delivery(
                undefined,
                'trans-test-789',
                'Carrera Test #10-20',
                'Medellín',
                'Antioquia',
                trackingNumber,
                estimatedDate,
                new Date(),
                new Date(),
            );

            const mockCreated = {
                id: 'del-created',
                transactionId: 'trans-test-789',
                address: 'Carrera Test #10-20',
                city: 'Medellín',
                department: 'Antioquia',
                trackingNumber: delivery.getTrackingNumber(),
                estimatedDeliveryDate: delivery.getEstimatedDeliveryDate(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.create.mockResolvedValue(mockCreated);

            await repository.save(delivery);

            expect(mockPrismaService.delivery.create).toHaveBeenCalledWith({
                data: {
                    transactionId: 'trans-test-789',
                    address: 'Carrera Test #10-20',
                    city: 'Medellín',
                    department: 'Antioquia',
                    trackingNumber: delivery.getTrackingNumber(),
                    estimatedDeliveryDate: delivery.getEstimatedDeliveryDate(),
                },
            });
        });

        it('should handle unique constraint violations', async () => {
            const trackingNumber = Delivery.generateTrackingNumber();
            const estimatedDate = Delivery.calculateEstimatedDelivery('Cali');
            const delivery = new Delivery(
                undefined,
                'trans-duplicate',
                'Calle Duplicada #1-1',
                'Cali',
                'Valle del Cauca',
                trackingNumber,
                estimatedDate,
                new Date(),
                new Date(),
            );

            mockPrismaService.delivery.create.mockRejectedValue(
                new Error('Unique constraint failed on transactionId'),
            );

            const result = await repository.save(delivery);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error saving delivery');
        });

        it('should save delivery for local city with 3-day estimate', async () => {
            const trackingNumber = Delivery.generateTrackingNumber();
            const estimatedDate = Delivery.calculateEstimatedDelivery('Bogotá');
            const delivery = new Delivery(
                undefined,
                'trans-local',
                'Calle Local #5-6',
                'Bogotá',
                'Cundinamarca',
                trackingNumber,
                estimatedDate,
                new Date(),
                new Date(),
            );

            const mockCreated = {
                id: 'del-local',
                transactionId: 'trans-local',
                address: 'Calle Local #5-6',
                city: 'Bogotá',
                department: 'Cundinamarca',
                trackingNumber: delivery.getTrackingNumber(),
                estimatedDeliveryDate: delivery.getEstimatedDeliveryDate(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.create.mockResolvedValue(mockCreated);

            const result = await repository.save(delivery);

            expect(result.isSuccess).toBe(true);
            const savedDelivery = result.getValue();
            const daysUntilDelivery = Math.ceil(
                (savedDelivery.getEstimatedDeliveryDate().getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24),
            );
            expect(daysUntilDelivery).toBeLessThanOrEqual(3);
        });

        it('should save delivery for national city with 7-day estimate', async () => {
            const trackingNumber = Delivery.generateTrackingNumber();
            const estimatedDate = Delivery.calculateEstimatedDelivery('Cartagena');
            const delivery = new Delivery(
                undefined,
                'trans-national',
                'Calle Nacional #7-8',
                'Cartagena',
                'Bolívar',
                trackingNumber,
                estimatedDate,
                new Date(),
                new Date(),
            );

            const mockCreated = {
                id: 'del-national',
                transactionId: 'trans-national',
                address: 'Calle Nacional #7-8',
                city: 'Cartagena',
                department: 'Bolívar',
                trackingNumber: delivery.getTrackingNumber(),
                estimatedDeliveryDate: delivery.getEstimatedDeliveryDate(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.create.mockResolvedValue(mockCreated);

            const result = await repository.save(delivery);

            expect(result.isSuccess).toBe(true);
            const savedDelivery = result.getValue();
            const daysUntilDelivery = Math.ceil(
                (savedDelivery.getEstimatedDeliveryDate().getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24),
            );
            expect(daysUntilDelivery).toBeLessThanOrEqual(7);
        });
    });

    describe('update', () => {
        it('should update existing delivery successfully', async () => {
            const delivery = new Delivery(
                'del-123',
                'trans-456',
                'Calle Actualizada #10-20',
                'Bogotá',
                'Cundinamarca',
                'TRACK-UPDATED-001',
                new Date('2024-01-15'),
                new Date('2024-01-01'),
                new Date(),
            );

            const mockUpdated = {
                id: 'del-123',
                transactionId: 'trans-456',
                address: 'Calle Actualizada #10-20',
                city: 'Bogotá',
                department: 'Cundinamarca',
                trackingNumber: 'TRACK-UPDATED-001',
                estimatedDeliveryDate: new Date('2024-01-15'),
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.update.mockResolvedValue(mockUpdated);

            const result = await repository.update(delivery);

            expect(result.isSuccess).toBe(true);
            const json = result.getValue().toJSON();
            expect(json.address).toBe('Calle Actualizada #10-20');
        });

        it('should call update with correct parameters', async () => {
            const estimatedDate = new Date('2024-01-20');
            const delivery = new Delivery(
                'del-789',
                'trans-999',
                'Nueva Dirección #30-40',
                'Medellín',
                'Antioquia',
                'TRACK-NEW-002',
                estimatedDate,
                new Date('2024-01-01'),
                new Date(),
            );

            const mockUpdated = {
                id: 'del-789',
                transactionId: 'trans-999',
                address: 'Nueva Dirección #30-40',
                city: 'Medellín',
                department: 'Antioquia',
                trackingNumber: 'TRACK-NEW-002',
                estimatedDeliveryDate: estimatedDate,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.update.mockResolvedValue(mockUpdated);

            await repository.update(delivery);

            expect(mockPrismaService.delivery.update).toHaveBeenCalledWith({
                where: { id: 'del-789' },
                data: {
                    address: 'Nueva Dirección #30-40',
                    city: 'Medellín',
                    department: 'Antioquia',
                    trackingNumber: 'TRACK-NEW-002',
                    estimatedDeliveryDate: estimatedDate,
                    updatedAt: expect.any(Date),
                },
            });
        });

        it('should handle delivery not found errors', async () => {
            const delivery = new Delivery(
                'nonexistent',
                'trans-none',
                'Calle Inexistente #1-1',
                'Bogotá',
                'Cundinamarca',
                'TRACK-NONE',
                new Date(),
                new Date(),
                new Date(),
            );

            mockPrismaService.delivery.update.mockRejectedValue(new Error('Record not found'));

            const result = await repository.update(delivery);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error updating delivery');
        });

        it('should update address only', async () => {
            const delivery = new Delivery(
                'del-address',
                'trans-address',
                'Solo Dirección Actualizada #99-99',
                'Cali',
                'Valle del Cauca',
                'TRACK-ADDRESS',
                new Date('2024-01-25'),
                new Date('2024-01-01'),
                new Date(),
            );

            const mockUpdated = {
                id: 'del-address',
                transactionId: 'trans-address',
                address: 'Solo Dirección Actualizada #99-99',
                city: 'Cali',
                department: 'Valle del Cauca',
                trackingNumber: 'TRACK-ADDRESS',
                estimatedDeliveryDate: new Date('2024-01-25'),
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.update.mockResolvedValue(mockUpdated);

            const result = await repository.update(delivery);

            expect(result.isSuccess).toBe(true);
            const json = result.getValue().toJSON();
            expect(json.address).toBe('Solo Dirección Actualizada #99-99');
        });

        it('should handle database errors', async () => {
            const delivery = new Delivery(
                'del-error',
                'trans-error',
                'Calle Error #1-1',
                'Bogotá',
                'Cundinamarca',
                'TRACK-ERROR',
                new Date(),
                new Date(),
                new Date(),
            );

            mockPrismaService.delivery.update.mockRejectedValue(new Error('Connection lost'));

            const result = await repository.update(delivery);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error updating delivery');
        });
    });

    describe('toDomain conversion', () => {
        it('should convert database model to domain entity correctly', async () => {
            const estimatedDate = new Date('2024-01-20T15:30:00Z');
            const createdDate = new Date('2024-01-01T10:00:00Z');
            const updatedDate = new Date('2024-01-15T12:00:00Z');

            const mockDelivery = {
                id: 'del-convert',
                transactionId: 'trans-convert-123',
                address: 'Calle Conversión #100-200',
                city: 'Bucaramanga',
                department: 'Santander',
                trackingNumber: 'TRACK-CONVERT-123',
                estimatedDeliveryDate: estimatedDate,
                createdAt: createdDate,
                updatedAt: updatedDate,
            };

            mockPrismaService.delivery.findUnique.mockResolvedValue(mockDelivery);

            const result = await repository.findById('del-convert');

            expect(result.isSuccess).toBe(true);
            const delivery = result.getValue();
            expect(delivery.getId()).toBe('del-convert');
            const json = delivery.toJSON();
            expect(json.transactionId).toBe('trans-convert-123');
            expect(json.address).toBe('Calle Conversión #100-200');
            expect(json.city).toBe('Bucaramanga');
            expect(json.department).toBe('Santander');
            expect(delivery.getTrackingNumber()).toBe('TRACK-CONVERT-123');
            expect(delivery.getEstimatedDeliveryDate()).toEqual(estimatedDate);
        });

        it('should handle special characters in address', async () => {
            const mockDelivery = {
                id: 'del-special',
                transactionId: 'trans-special',
                address: 'Calle 123 #45-67 Apto 89, Edificio "Torres del Norte"',
                city: 'Bogotá',
                department: 'Cundinamarca',
                trackingNumber: 'TRACK-SPECIAL',
                estimatedDeliveryDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.findUnique.mockResolvedValue(mockDelivery);

            const result = await repository.findById('del-special');

            expect(result.isSuccess).toBe(true);
            const json = result.getValue().toJSON();
            expect(json.address).toBe('Calle 123 #45-67 Apto 89, Edificio "Torres del Norte"');
        });

        it('should handle all Colombian cities correctly', async () => {
            const cities = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena'];

            for (const city of cities) {
                const mockDelivery = {
                    id: `del-${city}`,
                    transactionId: `trans-${city}`,
                    address: `Calle ${city} #1-2`,
                    city: city,
                    department: 'Test Department',
                    trackingNumber: `TRACK-${city}`,
                    estimatedDeliveryDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                mockPrismaService.delivery.findUnique.mockResolvedValue(mockDelivery);

                const result = await repository.findById(`del-${city}`);

                expect(result.isSuccess).toBe(true);
                const json = result.getValue().toJSON();
                expect(json.city).toBe(city);
            }
        });
    });

    describe('edge cases', () => {
        it('should handle very long addresses', async () => {
            const longAddress = 'A'.repeat(500);
            const mockDelivery = {
                id: 'del-long',
                transactionId: 'trans-long',
                address: longAddress,
                city: 'Bogotá',
                department: 'Cundinamarca',
                trackingNumber: 'TRACK-LONG',
                estimatedDeliveryDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.delivery.findUnique.mockResolvedValue(mockDelivery);

            const result = await repository.findById('del-long');

            expect(result.isSuccess).toBe(true);
            const json = result.getValue().toJSON();
            expect(json.address).toBe(longAddress);
        });

        it('should handle tracking numbers with different formats', async () => {
            const trackingNumbers = [
                'TRACK-1234567890',
                'TRK-ABC-123',
                '1234567890',
                'CUSTOM-TRACK-001',
            ];

            for (const trackingNumber of trackingNumbers) {
                const mockDelivery = {
                    id: `del-${trackingNumber}`,
                    transactionId: `trans-${trackingNumber}`,
                    address: 'Test Address',
                    city: 'Bogotá',
                    department: 'Cundinamarca',
                    trackingNumber: trackingNumber,
                    estimatedDeliveryDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                mockPrismaService.delivery.findUnique.mockResolvedValue(mockDelivery);

                const result = await repository.findById(`del-${trackingNumber}`);

                expect(result.isSuccess).toBe(true);
                expect(result.getValue().getTrackingNumber()).toBe(trackingNumber);
            }
        });
    });
});
