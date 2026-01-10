/**
 * Luhn Algorithm implementation for credit card validation
 * https://en.wikipedia.org/wiki/Luhn_algorithm
 */
export class CardValidatorUtil {
    /**
     * Validates card number using Luhn algorithm
     */
    static validateLuhn(cardNumber: string): boolean {
        const digits = cardNumber.replace(/\D/g, '');

        if (digits.length < 13 || digits.length > 19) {
            return false;
        }

        let sum = 0;
        let isEven = false;

        // Loop through values starting from the rightmost digit
        for (let i = digits.length - 1; i >= 0; i--) {
            let digit = parseInt(digits.charAt(i), 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    /**
     * Detects card type based on card number
     */
    static detectCardType(cardNumber: string): 'VISA' | 'MASTERCARD' | 'UNKNOWN' {
        const digits = cardNumber.replace(/\D/g, '');

        // Visa starts with 4
        if (/^4/.test(digits)) {
            return 'VISA';
        }

        // Mastercard starts with 51-55 or 2221-2720
        if (/^5[1-5]/.test(digits) || /^2(?:22[1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720)/.test(digits)) {
            return 'MASTERCARD';
        }

        return 'UNKNOWN';
    }

    /**
     * Generates fake but valid card numbers for testing (Luhn valid)
     */
    static generateTestCard(type: 'VISA' | 'MASTERCARD' = 'VISA'): string {
        const prefix = type === 'VISA' ? '4' : '5';
        let cardNumber = prefix;

        // Generate 14 random digits
        for (let i = 0; i < 14; i++) {
            cardNumber += Math.floor(Math.random() * 10);
        }

        // Calculate Luhn check digit
        const checkDigit = this.calculateLuhnCheckDigit(cardNumber);
        return cardNumber + checkDigit;
    }

    private static calculateLuhnCheckDigit(partialNumber: string): number {
        let sum = 0;
        let isEven = true;

        for (let i = partialNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(partialNumber.charAt(i), 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return (10 - (sum % 10)) % 10;
    }
}