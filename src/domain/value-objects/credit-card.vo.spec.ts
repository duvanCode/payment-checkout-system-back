import { CreditCard, CardType } from './credit-card.vo';

describe('CreditCard Value Object', () => {
    const validVisaCard = {
        number: '4111111111111111',
        holderName: 'John Doe',
        expirationMonth: '12',
        expirationYear: '30',
        cvv: '123',
    };

    const validMastercardCard = {
        number: '5500000000000004',
        holderName: 'Jane Smith',
        expirationMonth: '06',
        expirationYear: '28',
        cvv: '456',
    };

    describe('create', () => {
        it('should create a valid Visa card', () => {
            const card = CreditCard.create(
                validVisaCard.number,
                validVisaCard.holderName,
                validVisaCard.expirationMonth,
                validVisaCard.expirationYear,
                validVisaCard.cvv,
            );

            expect(card.getNumber()).toBe('4111111111111111');
            expect(card.getHolderName()).toBe('John Doe');
            expect(card.getType()).toBe(CardType.VISA);
            expect(card.isVisa()).toBe(true);
            expect(card.isMastercard()).toBe(false);
        });

        it('should create a valid Mastercard', () => {
            const card = CreditCard.create(
                validMastercardCard.number,
                validMastercardCard.holderName,
                validMastercardCard.expirationMonth,
                validMastercardCard.expirationYear,
                validMastercardCard.cvv,
            );

            expect(card.getNumber()).toBe('5500000000000004');
            expect(card.getHolderName()).toBe('Jane Smith');
            expect(card.getType()).toBe(CardType.MASTERCARD);
            expect(card.isVisa()).toBe(false);
            expect(card.isMastercard()).toBe(true);
        });

        it('should remove spaces from card number', () => {
            const card = CreditCard.create(
                '4111 1111 1111 1111',
                validVisaCard.holderName,
                validVisaCard.expirationMonth,
                validVisaCard.expirationYear,
                validVisaCard.cvv,
            );

            expect(card.getNumber()).toBe('4111111111111111');
        });

        it('should create card with 4-digit CVV', () => {
            const card = CreditCard.create(
                validVisaCard.number,
                validVisaCard.holderName,
                validVisaCard.expirationMonth,
                validVisaCard.expirationYear,
                '1234',
            );

            expect(card.getCvv()).toBe('1234');
        });

        it('should detect UNKNOWN card type for unsupported cards', () => {
            const card = CreditCard.create(
                '3530111333300000',
                validVisaCard.holderName,
                validVisaCard.expirationMonth,
                validVisaCard.expirationYear,
                validVisaCard.cvv,
            );

            expect(card.getType()).toBe(CardType.UNKNOWN);
        });
    });

    describe('validation - card number', () => {
        it('should throw error for card number too short', () => {
            expect(() =>
                CreditCard.create(
                    '411111111',
                    validVisaCard.holderName,
                    validVisaCard.expirationMonth,
                    validVisaCard.expirationYear,
                    validVisaCard.cvv,
                ),
            ).toThrow('Invalid card number length');
        });

        it('should throw error for card number too long', () => {
            expect(() =>
                CreditCard.create(
                    '41111111111111111111',
                    validVisaCard.holderName,
                    validVisaCard.expirationMonth,
                    validVisaCard.expirationYear,
                    validVisaCard.cvv,
                ),
            ).toThrow('Invalid card number length');
        });

        it('should throw error for non-numeric card number', () => {
            expect(() =>
                CreditCard.create(
                    '4111-1111-1111-1111',
                    validVisaCard.holderName,
                    validVisaCard.expirationMonth,
                    validVisaCard.expirationYear,
                    validVisaCard.cvv,
                ),
            ).toThrow('Card number must contain only digits');
        });

        it('should throw error for card number with letters', () => {
            expect(() =>
                CreditCard.create(
                    '411111111111111A',
                    validVisaCard.holderName,
                    validVisaCard.expirationMonth,
                    validVisaCard.expirationYear,
                    validVisaCard.cvv,
                ),
            ).toThrow('Card number must contain only digits');
        });
    });

    describe('validation - CVV', () => {
        it('should throw error for CVV too short', () => {
            expect(() =>
                CreditCard.create(
                    validVisaCard.number,
                    validVisaCard.holderName,
                    validVisaCard.expirationMonth,
                    validVisaCard.expirationYear,
                    '12',
                ),
            ).toThrow('Invalid CVV');
        });

        it('should throw error for CVV too long', () => {
            expect(() =>
                CreditCard.create(
                    validVisaCard.number,
                    validVisaCard.holderName,
                    validVisaCard.expirationMonth,
                    validVisaCard.expirationYear,
                    '12345',
                ),
            ).toThrow('Invalid CVV');
        });

        it('should throw error for non-numeric CVV', () => {
            expect(() =>
                CreditCard.create(
                    validVisaCard.number,
                    validVisaCard.holderName,
                    validVisaCard.expirationMonth,
                    validVisaCard.expirationYear,
                    'ABC',
                ),
            ).toThrow('Invalid CVV');
        });
    });

    describe('validation - expiration date', () => {
        it('should throw error for invalid expiration month (0)', () => {
            expect(() =>
                CreditCard.create(
                    validVisaCard.number,
                    validVisaCard.holderName,
                    '0',
                    validVisaCard.expirationYear,
                    validVisaCard.cvv,
                ),
            ).toThrow('Invalid expiration month');
        });

        it('should throw error for invalid expiration month (13)', () => {
            expect(() =>
                CreditCard.create(
                    validVisaCard.number,
                    validVisaCard.holderName,
                    '13',
                    validVisaCard.expirationYear,
                    validVisaCard.cvv,
                ),
            ).toThrow('Invalid expiration month');
        });

        it('should throw error for expired card', () => {
            const currentYear = new Date().getFullYear() % 100;
            const lastYear = (currentYear - 1).toString();

            expect(() =>
                CreditCard.create(
                    validVisaCard.number,
                    validVisaCard.holderName,
                    '12',
                    lastYear,
                    validVisaCard.cvv,
                ),
            ).toThrow('Card is expired');
        });

        it('should accept card with current year', () => {
            const currentYear = (new Date().getFullYear() % 100).toString().padStart(2, '0');

            const card = CreditCard.create(
                validVisaCard.number,
                validVisaCard.holderName,
                '12',
                currentYear,
                validVisaCard.cvv,
            );

            expect(card).toBeDefined();
        });
    });

    describe('validation - holder name', () => {
        it('should throw error for empty holder name', () => {
            expect(() =>
                CreditCard.create(
                    validVisaCard.number,
                    '',
                    validVisaCard.expirationMonth,
                    validVisaCard.expirationYear,
                    validVisaCard.cvv,
                ),
            ).toThrow('Invalid card holder name');
        });

        it('should throw error for holder name too short', () => {
            expect(() =>
                CreditCard.create(
                    validVisaCard.number,
                    'AB',
                    validVisaCard.expirationMonth,
                    validVisaCard.expirationYear,
                    validVisaCard.cvv,
                ),
            ).toThrow('Invalid card holder name');
        });

        it('should throw error for holder name with only spaces', () => {
            expect(() =>
                CreditCard.create(
                    validVisaCard.number,
                    '   ',
                    validVisaCard.expirationMonth,
                    validVisaCard.expirationYear,
                    validVisaCard.cvv,
                ),
            ).toThrow('Invalid card holder name');
        });
    });

    describe('getMaskedNumber', () => {
        it('should return masked card number showing only last 4 digits', () => {
            const card = CreditCard.create(
                validVisaCard.number,
                validVisaCard.holderName,
                validVisaCard.expirationMonth,
                validVisaCard.expirationYear,
                validVisaCard.cvv,
            );

            expect(card.getMaskedNumber()).toBe('**** **** **** 1111');
        });

        it('should mask Mastercard correctly', () => {
            const card = CreditCard.create(
                validMastercardCard.number,
                validMastercardCard.holderName,
                validMastercardCard.expirationMonth,
                validMastercardCard.expirationYear,
                validMastercardCard.cvv,
            );

            expect(card.getMaskedNumber()).toBe('**** **** **** 0004');
        });
    });

    describe('getters', () => {
        it('should return all card details correctly', () => {
            const card = CreditCard.create(
                validVisaCard.number,
                validVisaCard.holderName,
                validVisaCard.expirationMonth,
                validVisaCard.expirationYear,
                validVisaCard.cvv,
            );

            expect(card.getNumber()).toBe('4111111111111111');
            expect(card.getHolderName()).toBe('John Doe');
            expect(card.getExpirationMonth()).toBe('12');
            expect(card.getExpirationYear()).toBe('30');
            expect(card.getCvv()).toBe('123');
        });
    });

    describe('card type detection', () => {
        it('should detect Visa starting with 4', () => {
            const card = CreditCard.create(
                '4000000000000000',
                validVisaCard.holderName,
                validVisaCard.expirationMonth,
                validVisaCard.expirationYear,
                validVisaCard.cvv,
            );

            expect(card.getType()).toBe(CardType.VISA);
        });

        it('should detect Mastercard starting with 51', () => {
            const card = CreditCard.create(
                '5100000000000000',
                validVisaCard.holderName,
                validVisaCard.expirationMonth,
                validVisaCard.expirationYear,
                validVisaCard.cvv,
            );

            expect(card.getType()).toBe(CardType.MASTERCARD);
        });

        it('should detect Mastercard starting with 55', () => {
            const card = CreditCard.create(
                '5500000000000000',
                validVisaCard.holderName,
                validVisaCard.expirationMonth,
                validVisaCard.expirationYear,
                validVisaCard.cvv,
            );

            expect(card.getType()).toBe(CardType.MASTERCARD);
        });

        it('should return UNKNOWN for other card types', () => {
            const card = CreditCard.create(
                '6011000000000000',
                validVisaCard.holderName,
                validVisaCard.expirationMonth,
                validVisaCard.expirationYear,
                validVisaCard.cvv,
            );

            expect(card.getType()).toBe(CardType.UNKNOWN);
        });
    });
});