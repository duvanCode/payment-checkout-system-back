import { Customer } from './customer.entity';

describe('Customer Entity', () => {
    const mockDate = new Date('2024-01-01');

    describe('constructor - valid customer', () => {
        it('should create customer with valid data', () => {
            const customer = new Customer(
                'cust-123',
                'john.doe@example.com',
                '3001234567',
                'John Doe',
                mockDate,
                mockDate,
            );

            expect(customer.getId()).toBe('cust-123');
            expect(customer.getEmail()).toBe('john.doe@example.com');
            expect(customer.getPhone()).toBe('3001234567');
            expect(customer.getFullName()).toBe('John Doe');
        });

        it('should create customer without id (new customer)', () => {
            const customer = new Customer(
                undefined,
                'jane.smith@example.com',
                '3109876543',
                'Jane Smith',
                mockDate,
                mockDate,
            );

            expect(customer.getId()).toBeUndefined();
            expect(customer.getEmail()).toBe('jane.smith@example.com');
        });

        it('should create customer with phone number exactly 7 digits', () => {
            const customer = new Customer(
                'cust-456',
                'test@example.com',
                '1234567',
                'Test User',
                mockDate,
                mockDate,
            );

            expect(customer.getPhone()).toBe('1234567');
        });

        it('should create customer with full name exactly 3 characters', () => {
            const customer = new Customer(
                'cust-789',
                'min@example.com',
                '3001234567',
                'Ana',
                mockDate,
                mockDate,
            );

            expect(customer.getFullName()).toBe('Ana');
        });
    });

    describe('email validation', () => {
        it('should throw error for invalid email format', () => {
            expect(
                () =>
                    new Customer(
                        'cust-123',
                        'invalid-email',
                        '3001234567',
                        'John Doe',
                        mockDate,
                        mockDate,
                    ),
            ).toThrow('Invalid email format');
        });

        it('should throw error for email without @', () => {
            expect(
                () =>
                    new Customer(
                        'cust-123',
                        'invalidemail.com',
                        '3001234567',
                        'John Doe',
                        mockDate,
                        mockDate,
                    ),
            ).toThrow('Invalid email format');
        });

        it('should throw error for email without domain', () => {
            expect(
                () =>
                    new Customer(
                        'cust-123',
                        'test@',
                        '3001234567',
                        'John Doe',
                        mockDate,
                        mockDate,
                    ),
            ).toThrow('Invalid email format');
        });

        it('should throw error for email without local part', () => {
            expect(
                () =>
                    new Customer(
                        'cust-123',
                        '@example.com',
                        '3001234567',
                        'John Doe',
                        mockDate,
                        mockDate,
                    ),
            ).toThrow('Invalid email format');
        });

        it('should throw error for email with spaces', () => {
            expect(
                () =>
                    new Customer(
                        'cust-123',
                        'test @example.com',
                        '3001234567',
                        'John Doe',
                        mockDate,
                        mockDate,
                    ),
            ).toThrow('Invalid email format');
        });

        it('should accept valid email with plus sign', () => {
            const customer = new Customer(
                'cust-123',
                'test+tag@example.com',
                '3001234567',
                'John Doe',
                mockDate,
                mockDate,
            );

            expect(customer.getEmail()).toBe('test+tag@example.com');
        });

        it('should accept valid email with subdomain', () => {
            const customer = new Customer(
                'cust-123',
                'test@mail.example.com',
                '3001234567',
                'John Doe',
                mockDate,
                mockDate,
            );

            expect(customer.getEmail()).toBe('test@mail.example.com');
        });
    });

    describe('phone validation', () => {
        it('should throw error for phone with less than 7 digits', () => {
            expect(
                () =>
                    new Customer(
                        'cust-123',
                        'test@example.com',
                        '123456',
                        'John Doe',
                        mockDate,
                        mockDate,
                    ),
            ).toThrow('Invalid phone number');
        });

        it('should throw error for empty phone', () => {
            expect(
                () =>
                    new Customer(
                        'cust-123',
                        'test@example.com',
                        '',
                        'John Doe',
                        mockDate,
                        mockDate,
                    ),
            ).toThrow('Invalid phone number');
        });

        it('should accept phone with more than 7 digits', () => {
            const customer = new Customer(
                'cust-123',
                'test@example.com',
                '573001234567',
                'John Doe',
                mockDate,
                mockDate,
            );

            expect(customer.getPhone()).toBe('573001234567');
        });

        it('should accept phone with exactly 10 digits', () => {
            const customer = new Customer(
                'cust-123',
                'test@example.com',
                '3001234567',
                'John Doe',
                mockDate,
                mockDate,
            );

            expect(customer.getPhone()).toBe('3001234567');
        });
    });

    describe('full name validation', () => {
        it('should throw error for empty full name', () => {
            expect(
                () =>
                    new Customer(
                        'cust-123',
                        'test@example.com',
                        '3001234567',
                        '',
                        mockDate,
                        mockDate,
                    ),
            ).toThrow('Invalid full name');
        });

        it('should throw error for full name with only spaces', () => {
            expect(
                () =>
                    new Customer(
                        'cust-123',
                        'test@example.com',
                        '3001234567',
                        '   ',
                        mockDate,
                        mockDate,
                    ),
            ).toThrow('Invalid full name');
        });

        it('should throw error for full name shorter than 3 characters', () => {
            expect(
                () =>
                    new Customer(
                        'cust-123',
                        'test@example.com',
                        '3001234567',
                        'Jo',
                        mockDate,
                        mockDate,
                    ),
            ).toThrow('Invalid full name');
        });

        it('should accept full name with special characters', () => {
            const customer = new Customer(
                'cust-123',
                'test@example.com',
                '3001234567',
                "María José O'Connor-Smith",
                mockDate,
                mockDate,
            );

            expect(customer.getFullName()).toBe("María José O'Connor-Smith");
        });

        it('should accept long full names', () => {
            const customer = new Customer(
                'cust-123',
                'test@example.com',
                '3001234567',
                'Juan Carlos de la Cruz Rodríguez González',
                mockDate,
                mockDate,
            );

            expect(customer.getFullName()).toBe('Juan Carlos de la Cruz Rodríguez González');
        });
    });

    describe('toJSON', () => {
        it('should serialize customer to JSON', () => {
            const customer = new Customer(
                'cust-123',
                'john.doe@example.com',
                '3001234567',
                'John Doe',
                mockDate,
                mockDate,
            );

            const json = customer.toJSON();

            expect(json).toEqual({
                id: 'cust-123',
                email: 'john.doe@example.com',
                phone: '3001234567',
                fullName: 'John Doe',
                createdAt: mockDate,
                updatedAt: mockDate,
            });
        });

        it('should serialize customer without id', () => {
            const customer = new Customer(
                undefined,
                'test@example.com',
                '3001234567',
                'Test User',
                mockDate,
                mockDate,
            );

            const json = customer.toJSON();

            expect(json.id).toBeUndefined();
        });
    });

    describe('edge cases', () => {
        it('should handle customer with minimal valid data', () => {
            const customer = new Customer(
                undefined,
                'a@b.c',
                '1234567',
                'Ana',
                mockDate,
                mockDate,
            );

            expect(customer.getEmail()).toBe('a@b.c');
            expect(customer.getPhone()).toBe('1234567');
            expect(customer.getFullName()).toBe('Ana');
        });

        it('should handle customer with unicode characters in name', () => {
            const customer = new Customer(
                'cust-123',
                'test@example.com',
                '3001234567',
                '李明 Wang',
                mockDate,
                mockDate,
            );

            expect(customer.getFullName()).toBe('李明 Wang');
        });
    });
});
