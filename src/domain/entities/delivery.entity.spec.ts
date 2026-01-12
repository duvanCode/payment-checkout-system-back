import { Delivery } from './delivery.entity';

describe('Delivery Entity', () => {
    const mockDate = new Date('2024-01-01');
    const mockEstimatedDate = new Date('2024-01-10');

    describe('constructor', () => {
        it('should create delivery with all properties', () => {
            const delivery = new Delivery(
                'delivery-123',
                'trans-456',
                'Calle 123 #45-67',
                'Bogotá',
                'Cundinamarca',
                'TRACK-12345-ABC',
                mockEstimatedDate,
                mockDate,
                mockDate,
            );

            expect(delivery.getId()).toBe('delivery-123');
            expect(delivery.getTrackingNumber()).toBe('TRACK-12345-ABC');
            expect(delivery.getEstimatedDeliveryDate()).toEqual(mockEstimatedDate);
        });

        it('should create delivery without id (new delivery)', () => {
            const delivery = new Delivery(
                undefined,
                'trans-789',
                'Carrera 15 #30-45',
                'Medellín',
                'Antioquia',
                'TRACK-67890-XYZ',
                mockEstimatedDate,
                mockDate,
                mockDate,
            );

            expect(delivery.getId()).toBeUndefined();
            expect(delivery.getTrackingNumber()).toBe('TRACK-67890-XYZ');
        });
    });

    describe('generateTrackingNumber', () => {
        it('should generate tracking number with correct format', () => {
            const trackingNumber = Delivery.generateTrackingNumber();

            expect(trackingNumber).toMatch(/^TRACK-\d+-[A-Z0-9]{6}$/);
        });

        it('should generate unique tracking numbers', () => {
            const tracking1 = Delivery.generateTrackingNumber();
            const tracking2 = Delivery.generateTrackingNumber();

            expect(tracking1).not.toBe(tracking2);
        });

        it('should start with TRACK- prefix', () => {
            const trackingNumber = Delivery.generateTrackingNumber();

            expect(trackingNumber.startsWith('TRACK-')).toBe(true);
        });

        it('should generate tracking numbers with consistent structure', () => {
            const trackingNumbers = Array.from({ length: 10 }, () =>
                Delivery.generateTrackingNumber(),
            );

            trackingNumbers.forEach((tracking) => {
                expect(tracking).toMatch(/^TRACK-\d+-[A-Z0-9]{6}$/);
            });
        });
    });

    describe('calculateEstimatedDelivery', () => {
        it('should calculate 3 days for Bogotá', () => {
            const now = new Date();
            const estimated = Delivery.calculateEstimatedDelivery('Bogotá');

            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 3);

            expect(estimated.getDate()).toBe(expectedDate.getDate());
            expect(estimated.getMonth()).toBe(expectedDate.getMonth());
        });

        it('should calculate 3 days for bogotá (lowercase)', () => {
            const estimated = Delivery.calculateEstimatedDelivery('bogotá');

            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 3);

            expect(estimated.getDate()).toBe(expectedDate.getDate());
        });

        it('should calculate 7 days for Medellín', () => {
            const estimated = Delivery.calculateEstimatedDelivery('Medellín');

            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 7);

            expect(estimated.getDate()).toBe(expectedDate.getDate());
            expect(estimated.getMonth()).toBe(expectedDate.getMonth());
        });

        it('should calculate 7 days for Cali', () => {
            const estimated = Delivery.calculateEstimatedDelivery('Cali');

            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 7);

            expect(estimated.getDate()).toBe(expectedDate.getDate());
        });

        it('should calculate 7 days for any other city', () => {
            const estimated = Delivery.calculateEstimatedDelivery('Barranquilla');

            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 7);

            expect(estimated.getDate()).toBe(expectedDate.getDate());
        });

        it('should calculate 7 days for unknown cities', () => {
            const estimated = Delivery.calculateEstimatedDelivery('Unknown City');

            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 7);

            expect(estimated.getDate()).toBe(expectedDate.getDate());
        });

        it('should handle BOGOTÁ (uppercase)', () => {
            const estimated = Delivery.calculateEstimatedDelivery('BOGOTÁ');

            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 3);

            expect(estimated.getDate()).toBe(expectedDate.getDate());
        });

        it('should handle BogOtÁ (mixed case)', () => {
            const estimated = Delivery.calculateEstimatedDelivery('BogOtÁ');

            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 3);

            expect(estimated.getDate()).toBe(expectedDate.getDate());
        });

        it('should handle empty city as non-Bogotá (7 days)', () => {
            const estimated = Delivery.calculateEstimatedDelivery('');

            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 7);

            expect(estimated.getDate()).toBe(expectedDate.getDate());
        });
    });

    describe('toJSON', () => {
        it('should serialize delivery to JSON', () => {
            const delivery = new Delivery(
                'delivery-123',
                'trans-456',
                'Calle 123 #45-67',
                'Bogotá',
                'Cundinamarca',
                'TRACK-12345-ABC',
                mockEstimatedDate,
                mockDate,
                mockDate,
            );

            const json = delivery.toJSON();

            expect(json).toEqual({
                id: 'delivery-123',
                transactionId: 'trans-456',
                address: 'Calle 123 #45-67',
                city: 'Bogotá',
                department: 'Cundinamarca',
                trackingNumber: 'TRACK-12345-ABC',
                estimatedDeliveryDate: mockEstimatedDate,
                createdAt: mockDate,
                updatedAt: mockDate,
            });
        });

        it('should serialize delivery without id', () => {
            const delivery = new Delivery(
                undefined,
                'trans-789',
                'Carrera 15 #30-45',
                'Medellín',
                'Antioquia',
                'TRACK-67890-XYZ',
                mockEstimatedDate,
                mockDate,
                mockDate,
            );

            const json = delivery.toJSON();

            expect(json.id).toBeUndefined();
        });
    });

    describe('complete delivery workflow', () => {
        it('should create delivery for Bogotá with generated tracking', () => {
            const trackingNumber = Delivery.generateTrackingNumber();
            const estimatedDate = Delivery.calculateEstimatedDelivery('Bogotá');

            const delivery = new Delivery(
                undefined,
                'trans-123',
                'Calle 100 #50-25',
                'Bogotá',
                'Cundinamarca',
                trackingNumber,
                estimatedDate,
                new Date(),
                new Date(),
            );

            expect(delivery.getTrackingNumber()).toMatch(/^TRACK-\d+-[A-Z0-9]{6}$/);
            expect(delivery.getId()).toBeUndefined();
        });

        it('should create delivery for non-Bogotá city with generated tracking', () => {
            const trackingNumber = Delivery.generateTrackingNumber();
            const estimatedDate = Delivery.calculateEstimatedDelivery('Medellín');

            const delivery = new Delivery(
                undefined,
                'trans-456',
                'Carrera 70 #45-30',
                'Medellín',
                'Antioquia',
                trackingNumber,
                estimatedDate,
                new Date(),
                new Date(),
            );

            expect(delivery.getTrackingNumber()).toMatch(/^TRACK-\d+-[A-Z0-9]{6}$/);
        });
    });

    describe('edge cases', () => {
        it('should handle delivery with special characters in address', () => {
            const delivery = new Delivery(
                'delivery-123',
                'trans-456',
                'Calle 123 #45-67 Apto 301 Torre B',
                'Bogotá',
                'Cundinamarca',
                'TRACK-12345-ABC',
                mockEstimatedDate,
                mockDate,
                mockDate,
            );

            expect(delivery.getId()).toBe('delivery-123');
        });

        it('should handle delivery with very long address', () => {
            const longAddress = 'Calle Principal Con Carrera Secundaria Edificio Nombre Muy Largo Torre A Apartamento 1234 Interior 56 Conjunto Residencial';

            const delivery = new Delivery(
                'delivery-789',
                'trans-789',
                longAddress,
                'Cali',
                'Valle del Cauca',
                'TRACK-99999-ZZZ',
                mockEstimatedDate,
                mockDate,
                mockDate,
            );

            const json = delivery.toJSON();
            expect(json.address).toBe(longAddress);
        });
    });
});
