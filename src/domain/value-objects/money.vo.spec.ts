import { Money } from './money.vo';

describe('Money Value Object', () => {
    describe('from', () => {
        it('should create Money with valid amount and default currency COP', () => {
            const money = Money.from(1000);

            expect(money.getAmount()).toBe(1000);
            expect(money.getCurrency()).toBe('COP');
        });

        it('should create Money with valid amount and custom currency', () => {
            const money = Money.from(100, 'USD');

            expect(money.getAmount()).toBe(100);
            expect(money.getCurrency()).toBe('USD');
        });

        it('should create Money with zero amount', () => {
            const money = Money.from(0);

            expect(money.getAmount()).toBe(0);
            expect(money.getCurrency()).toBe('COP');
        });

        it('should throw error when amount is negative', () => {
            expect(() => Money.from(-100)).toThrow('Money amount cannot be negative');
        });

        it('should handle decimal amounts', () => {
            const money = Money.from(99.99);

            expect(money.getAmount()).toBe(99.99);
        });
    });

    describe('add', () => {
        it('should add two Money objects with same currency', () => {
            const money1 = Money.from(1000, 'COP');
            const money2 = Money.from(500, 'COP');

            const result = money1.add(money2);

            expect(result.getAmount()).toBe(1500);
            expect(result.getCurrency()).toBe('COP');
        });

        it('should throw error when adding Money with different currencies', () => {
            const money1 = Money.from(1000, 'COP');
            const money2 = Money.from(100, 'USD');

            expect(() => money1.add(money2)).toThrow(
                'Cannot add money with different currencies',
            );
        });

        it('should add zero amount', () => {
            const money1 = Money.from(1000, 'COP');
            const money2 = Money.from(0, 'COP');

            const result = money1.add(money2);

            expect(result.getAmount()).toBe(1000);
        });

        it('should handle decimal addition correctly', () => {
            const money1 = Money.from(10.5, 'USD');
            const money2 = Money.from(20.3, 'USD');

            const result = money1.add(money2);

            expect(result.getAmount()).toBe(30.8);
        });
    });

    describe('multiply', () => {
        it('should multiply Money by positive factor', () => {
            const money = Money.from(100, 'COP');

            const result = money.multiply(3);

            expect(result.getAmount()).toBe(300);
            expect(result.getCurrency()).toBe('COP');
        });

        it('should multiply Money by zero', () => {
            const money = Money.from(100, 'COP');

            const result = money.multiply(0);

            expect(result.getAmount()).toBe(0);
        });

        it('should multiply Money by decimal factor', () => {
            const money = Money.from(100, 'COP');

            const result = money.multiply(0.5);

            expect(result.getAmount()).toBe(50);
        });

        it('should multiply Money by factor greater than 1', () => {
            const money = Money.from(50, 'USD');

            const result = money.multiply(2.5);

            expect(result.getAmount()).toBe(125);
        });

        it('should handle precision in decimal multiplication', () => {
            const money = Money.from(33.33, 'COP');

            const result = money.multiply(3);

            expect(result.getAmount()).toBeCloseTo(99.99, 2);
        });
    });

    describe('toJSON', () => {
        it('should serialize Money to JSON object', () => {
            const money = Money.from(1000, 'COP');

            const json = money.toJSON();

            expect(json).toEqual({
                amount: 1000,
                currency: 'COP',
            });
        });

        it('should serialize Money with decimal amount', () => {
            const money = Money.from(99.99, 'USD');

            const json = money.toJSON();

            expect(json).toEqual({
                amount: 99.99,
                currency: 'USD',
            });
        });
    });

    describe('immutability', () => {
        it('should not mutate original Money when adding', () => {
            const money1 = Money.from(1000, 'COP');
            const money2 = Money.from(500, 'COP');

            money1.add(money2);

            expect(money1.getAmount()).toBe(1000);
            expect(money2.getAmount()).toBe(500);
        });

        it('should not mutate original Money when multiplying', () => {
            const money = Money.from(100, 'COP');

            money.multiply(3);

            expect(money.getAmount()).toBe(100);
        });
    });
});