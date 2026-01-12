import { PrismaCustomerRepository } from './prisma-customer.repository';
import { PrismaService } from '../database/prisma.service';
import { Customer } from '../../domain/entities/customer.entity';

describe('PrismaCustomerRepository', () => {
    let repository: PrismaCustomerRepository;
    let mockPrismaService: jest.Mocked<PrismaService>;

    beforeEach(() => {
        mockPrismaService = {
            customer: {
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        } as any;

        repository = new PrismaCustomerRepository(mockPrismaService);
    });

    describe('findById', () => {
        it('should return customer when found', async () => {
            const mockCustomer = {
                id: 'cust-123',
                email: 'test@example.com',
                phone: '3001234567',
                fullName: 'John Doe',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

            const result = await repository.findById('cust-123');

            expect(result.isSuccess).toBe(true);
            const customer = result.getValue();
            expect(customer.getId()).toBe('cust-123');
            expect(customer.getEmail()).toBe('test@example.com');
            expect(customer.getPhone()).toBe('3001234567');
            expect(customer.getFullName()).toBe('John Doe');
        });

        it('should return failure when customer not found', async () => {
            mockPrismaService.customer.findUnique.mockResolvedValue(null);

            const result = await repository.findById('nonexistent');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Customer not found');
        });

        it('should handle database errors', async () => {
            mockPrismaService.customer.findUnique.mockRejectedValue(
                new Error('Database connection error'),
            );

            const result = await repository.findById('cust-123');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error finding customer');
            expect(result.getError()).toContain('Database connection error');
        });

        it('should call findUnique with correct parameters', async () => {
            const mockCustomer = {
                id: 'cust-456',
                email: 'jane@example.com',
                phone: '3109876543',
                fullName: 'Jane Smith',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

            await repository.findById('cust-456');

            expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
                where: { id: 'cust-456' },
            });
        });
    });

    describe('findByEmail', () => {
        it('should return customer when found by email', async () => {
            const mockCustomer = {
                id: 'cust-email-1',
                email: 'search@example.com',
                phone: '3001234567',
                fullName: 'Search User',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

            const result = await repository.findByEmail('search@example.com');

            expect(result.isSuccess).toBe(true);
            const customer = result.getValue();
            expect(customer.getEmail()).toBe('search@example.com');
            expect(customer.getId()).toBe('cust-email-1');
        });

        it('should return failure when customer not found by email', async () => {
            mockPrismaService.customer.findUnique.mockResolvedValue(null);

            const result = await repository.findByEmail('notfound@example.com');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toBe('Customer not found');
        });

        it('should call findUnique with email where clause', async () => {
            const mockCustomer = {
                id: 'cust-789',
                email: 'test@example.com',
                phone: '3001234567',
                fullName: 'Test User',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

            await repository.findByEmail('test@example.com');

            expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
        });

        it('should handle database errors', async () => {
            mockPrismaService.customer.findUnique.mockRejectedValue(new Error('Query timeout'));

            const result = await repository.findByEmail('error@example.com');

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error finding customer');
        });

        it('should handle email case sensitivity correctly', async () => {
            const mockCustomer = {
                id: 'cust-case',
                email: 'CaseSensitive@Example.COM',
                phone: '3001234567',
                fullName: 'Case User',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

            const result = await repository.findByEmail('CaseSensitive@Example.COM');

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getEmail()).toBe('CaseSensitive@Example.COM');
        });
    });

    describe('save', () => {
        it('should save new customer successfully', async () => {
            const customer = new Customer(
                'cust-new',
                'newuser@example.com',
                '3001234567',
                'New User',
                new Date(),
                new Date(),
            );

            const mockCreated = {
                id: 'cust-created',
                email: 'newuser@example.com',
                phone: '3001234567',
                fullName: 'New User',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.create.mockResolvedValue(mockCreated);

            const result = await repository.save(customer);

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getEmail()).toBe('newuser@example.com');
        });

        it('should call create with correct data', async () => {
            const customer = new Customer(
                'cust-test',
                'test@example.com',
                '3109876543',
                'Test User',
                new Date(),
                new Date(),
            );

            const mockCreated = {
                id: 'cust-created',
                email: 'test@example.com',
                phone: '3109876543',
                fullName: 'Test User',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.create.mockResolvedValue(mockCreated);

            await repository.save(customer);

            expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
                data: {
                    email: 'test@example.com',
                    phone: '3109876543',
                    fullName: 'Test User',
                },
            });
        });

        it('should handle duplicate email errors', async () => {
            const customer = new Customer(
                'cust-dup',
                'duplicate@example.com',
                '3001234567',
                'Duplicate User',
                new Date(),
                new Date(),
            );

            mockPrismaService.customer.create.mockRejectedValue(
                new Error('Unique constraint failed on email'),
            );

            const result = await repository.save(customer);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error saving customer');
        });

        it('should handle validation errors', async () => {
            const customer = new Customer(
                'cust-invalid',
                'invalid@example.com',
                '3001234567',
                'Invalid User',
                new Date(),
                new Date(),
            );

            mockPrismaService.customer.create.mockRejectedValue(
                new Error('Invalid phone format'),
            );

            const result = await repository.save(customer);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error saving customer');
        });
    });

    describe('update', () => {
        it('should update existing customer successfully', async () => {
            const customer = new Customer(
                'cust-123',
                'updated@example.com',
                '3109999999',
                'Updated Name',
                new Date('2024-01-01'),
                new Date(),
            );

            const mockUpdated = {
                id: 'cust-123',
                email: 'updated@example.com',
                phone: '3109999999',
                fullName: 'Updated Name',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.update.mockResolvedValue(mockUpdated);

            const result = await repository.update(customer);

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getEmail()).toBe('updated@example.com');
            expect(result.getValue().getFullName()).toBe('Updated Name');
        });

        it('should call update with correct parameters', async () => {
            const customer = new Customer(
                'cust-456',
                'test@example.com',
                '3001234567',
                'Test User',
                new Date('2024-01-01'),
                new Date(),
            );

            const mockUpdated = {
                id: 'cust-456',
                email: 'test@example.com',
                phone: '3001234567',
                fullName: 'Test User',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.update.mockResolvedValue(mockUpdated);

            await repository.update(customer);

            expect(mockPrismaService.customer.update).toHaveBeenCalledWith({
                where: { id: 'cust-456' },
                data: {
                    email: 'test@example.com',
                    phone: '3001234567',
                    fullName: 'Test User',
                    updatedAt: expect.any(Date),
                },
            });
        });

        it('should handle customer not found errors', async () => {
            const customer = new Customer(
                'nonexistent',
                'notfound@example.com',
                '3001234567',
                'Not Found User',
                new Date(),
                new Date(),
            );

            mockPrismaService.customer.update.mockRejectedValue(new Error('Record not found'));

            const result = await repository.update(customer);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error updating customer');
        });

        it('should handle email uniqueness violation', async () => {
            const customer = new Customer(
                'cust-789',
                'existing@example.com',
                '3001234567',
                'User',
                new Date(),
                new Date(),
            );

            mockPrismaService.customer.update.mockRejectedValue(
                new Error('Email already exists'),
            );

            const result = await repository.update(customer);

            expect(result.isFailure).toBe(true);
            expect(result.getError()).toContain('Error updating customer');
        });

        it('should update only provided fields', async () => {
            const customer = new Customer(
                'cust-partial',
                'same@example.com',
                '3007777777',
                'Same User',
                new Date('2024-01-01'),
                new Date(),
            );

            const mockUpdated = {
                id: 'cust-partial',
                email: 'same@example.com',
                phone: '3007777777',
                fullName: 'Same User',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.update.mockResolvedValue(mockUpdated);

            const result = await repository.update(customer);

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getPhone()).toBe('3007777777');
        });
    });

    describe('toDomain conversion', () => {
        it('should convert database model to domain entity correctly', async () => {
            const mockCustomer = {
                id: 'cust-convert',
                email: 'convert@example.com',
                phone: '3001112233',
                fullName: 'Conversion Test',
                createdAt: new Date('2024-01-15T10:30:00Z'),
                updatedAt: new Date('2024-01-16T15:45:00Z'),
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

            const result = await repository.findById('cust-convert');

            expect(result.isSuccess).toBe(true);
            const customer = result.getValue();
            expect(customer.getId()).toBe('cust-convert');
            expect(customer.getEmail()).toBe('convert@example.com');
            expect(customer.getPhone()).toBe('3001112233');
            expect(customer.getFullName()).toBe('Conversion Test');
        });

        it('should handle unicode characters in full name', async () => {
            const mockCustomer = {
                id: 'cust-unicode',
                email: 'unicode@example.com',
                phone: '3001234567',
                fullName: '李明 José García',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

            const result = await repository.findById('cust-unicode');

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getFullName()).toBe('李明 José García');
        });

        it('should handle special characters in email', async () => {
            const mockCustomer = {
                id: 'cust-special',
                email: 'user+tag@sub-domain.example.com',
                phone: '3001234567',
                fullName: 'Special Email User',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

            const result = await repository.findById('cust-special');

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getEmail()).toBe('user+tag@sub-domain.example.com');
        });
    });

    describe('edge cases', () => {
        it('should handle very long full names', async () => {
            const longName = 'A'.repeat(200);
            const mockCustomer = {
                id: 'cust-long',
                email: 'long@example.com',
                phone: '3001234567',
                fullName: longName,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

            const result = await repository.findById('cust-long');

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getFullName()).toBe(longName);
        });

        it('should handle minimum length phone numbers', async () => {
            const mockCustomer = {
                id: 'cust-phone',
                email: 'phone@example.com',
                phone: '3001234567',
                fullName: 'Phone Test',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

            const result = await repository.findById('cust-phone');

            expect(result.isSuccess).toBe(true);
            expect(result.getValue().getPhone()).toBe('3001234567');
        });
    });
});
