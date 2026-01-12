import { FEES, LOCAL_CITIES, getDeliveryFee } from './fees.constants';

describe('Fees Constants', () => {
    describe('FEES', () => {
        it('should have BASE_FEE defined', () => {
            expect(FEES.BASE_FEE).toBeDefined();
            expect(typeof FEES.BASE_FEE).toBe('number');
        });

        it('should have DELIVERY_FEE_LOCAL defined', () => {
            expect(FEES.DELIVERY_FEE_LOCAL).toBeDefined();
            expect(typeof FEES.DELIVERY_FEE_LOCAL).toBe('number');
        });

        it('should have DELIVERY_FEE_NATIONAL defined', () => {
            expect(FEES.DELIVERY_FEE_NATIONAL).toBeDefined();
            expect(typeof FEES.DELIVERY_FEE_NATIONAL).toBe('number');
        });

        it('should have positive fee values', () => {
            expect(FEES.BASE_FEE).toBeGreaterThan(0);
            expect(FEES.DELIVERY_FEE_LOCAL).toBeGreaterThan(0);
            expect(FEES.DELIVERY_FEE_NATIONAL).toBeGreaterThan(0);
        });

        it('should have local delivery fee less than national', () => {
            expect(FEES.DELIVERY_FEE_LOCAL).toBeLessThan(FEES.DELIVERY_FEE_NATIONAL);
        });
    });

    describe('LOCAL_CITIES', () => {
        it('should include Bogotá in various forms', () => {
            expect(LOCAL_CITIES).toContain('bogotá');
            expect(LOCAL_CITIES).toContain('bogota');
        });

        it('should include Soacha', () => {
            expect(LOCAL_CITIES).toContain('soacha');
        });

        it('should include Chía in various forms', () => {
            expect(LOCAL_CITIES).toContain('chía');
            expect(LOCAL_CITIES).toContain('chia');
        });

        it('should include Cajicá in various forms', () => {
            expect(LOCAL_CITIES).toContain('cajicá');
            expect(LOCAL_CITIES).toContain('cajica');
        });

        it('should include Zipaquirá in various forms', () => {
            expect(LOCAL_CITIES).toContain('zipaquirá');
            expect(LOCAL_CITIES).toContain('zipaquira');
        });

        it('should have all cities in lowercase', () => {
            LOCAL_CITIES.forEach((city) => {
                expect(city).toBe(city.toLowerCase());
            });
        });

        it('should have at least 8 cities defined', () => {
            expect(LOCAL_CITIES.length).toBeGreaterThanOrEqual(8);
        });
    });

    describe('getDeliveryFee', () => {
        describe('local cities', () => {
            it('should return local fee for Bogotá', () => {
                expect(getDeliveryFee('Bogotá')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should return local fee for bogota (without accent)', () => {
                expect(getDeliveryFee('bogota')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should return local fee for BOGOTÁ (uppercase)', () => {
                expect(getDeliveryFee('BOGOTÁ')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should return local fee for Soacha', () => {
                expect(getDeliveryFee('Soacha')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should return local fee for Chía', () => {
                expect(getDeliveryFee('Chía')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should return local fee for chia (without accent)', () => {
                expect(getDeliveryFee('chia')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should return local fee for Cajicá', () => {
                expect(getDeliveryFee('Cajicá')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should return local fee for cajica (without accent)', () => {
                expect(getDeliveryFee('cajica')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should return local fee for Zipaquirá', () => {
                expect(getDeliveryFee('Zipaquirá')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should return local fee for zipaquira (without accent)', () => {
                expect(getDeliveryFee('zipaquira')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should handle cities with extra spaces', () => {
                expect(getDeliveryFee('  Bogotá  ')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });

            it('should handle mixed case for local cities', () => {
                expect(getDeliveryFee('BoGoTá')).toBe(FEES.DELIVERY_FEE_LOCAL);
                expect(getDeliveryFee('SOACHA')).toBe(FEES.DELIVERY_FEE_LOCAL);
                expect(getDeliveryFee('ChÍa')).toBe(FEES.DELIVERY_FEE_LOCAL);
            });
        });

        describe('national cities', () => {
            it('should return national fee for Medellín', () => {
                expect(getDeliveryFee('Medellín')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should return national fee for Cali', () => {
                expect(getDeliveryFee('Cali')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should return national fee for Barranquilla', () => {
                expect(getDeliveryFee('Barranquilla')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should return national fee for Cartagena', () => {
                expect(getDeliveryFee('Cartagena')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should return national fee for Bucaramanga', () => {
                expect(getDeliveryFee('Bucaramanga')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should return national fee for Pereira', () => {
                expect(getDeliveryFee('Pereira')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should return national fee for unknown cities', () => {
                expect(getDeliveryFee('Unknown City')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should handle uppercase national cities', () => {
                expect(getDeliveryFee('MEDELLÍN')).toBe(FEES.DELIVERY_FEE_NATIONAL);
                expect(getDeliveryFee('CALI')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should handle national cities with extra spaces', () => {
                expect(getDeliveryFee('  Medellín  ')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });
        });

        describe('edge cases', () => {
            it('should return national fee for empty string', () => {
                expect(getDeliveryFee('')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should return national fee for whitespace only', () => {
                expect(getDeliveryFee('   ')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should handle very long city names', () => {
                const longCity = 'ThisIsAVeryLongCityNameThatDoesNotExist';
                expect(getDeliveryFee(longCity)).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should handle city names with numbers', () => {
                expect(getDeliveryFee('City123')).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });

            it('should handle city names with special characters', () => {
                expect(getDeliveryFee('City-Name')).toBe(FEES.DELIVERY_FEE_NATIONAL);
                expect(getDeliveryFee("City's Name")).toBe(FEES.DELIVERY_FEE_NATIONAL);
            });
        });

        describe('consistency', () => {
            it('should return same fee for same city called multiple times', () => {
                const city = 'Bogotá';
                const fee1 = getDeliveryFee(city);
                const fee2 = getDeliveryFee(city);
                const fee3 = getDeliveryFee(city);

                expect(fee1).toBe(fee2);
                expect(fee2).toBe(fee3);
            });

            it('should always return either local or national fee', () => {
                const cities = [
                    'Bogotá',
                    'Medellín',
                    'Cali',
                    'Soacha',
                    'Random',
                    '',
                    'Chía',
                ];

                cities.forEach((city) => {
                    const fee = getDeliveryFee(city);
                    expect(
                        fee === FEES.DELIVERY_FEE_LOCAL || fee === FEES.DELIVERY_FEE_NATIONAL,
                    ).toBe(true);
                });
            });
        });
    });
});
