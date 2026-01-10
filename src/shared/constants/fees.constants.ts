export const FEES = {
    BASE_FEE: parseInt(process.env.BASE_FEE || '2000'),
    DELIVERY_FEE_LOCAL: parseInt(process.env.DELIVERY_FEE_LOCAL || '5000'),
    DELIVERY_FEE_NATIONAL: parseInt(process.env.DELIVERY_FEE_NATIONAL || '10000'),
};

export const LOCAL_CITIES = [
    'bogotá',
    'bogota',
    'soacha',
    'chía',
    'chia',
    'cajicá',
    'cajica',
    'zipaquirá',
    'zipaquira',
];

export function getDeliveryFee(city: string): number {
    const normalizedCity = city.toLowerCase().trim();
    return LOCAL_CITIES.includes(normalizedCity)
        ? FEES.DELIVERY_FEE_LOCAL
        : FEES.DELIVERY_FEE_NATIONAL;
}