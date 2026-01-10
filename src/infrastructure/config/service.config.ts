import { registerAs } from '@nestjs/config';

export default registerAs('service', () => ({
    publicKey: process.env.WOMPI_PUBLIC_KEY,
    privateKey: process.env.WOMPI_PRIVATE_KEY,
    baseUrl: process.env.WOMPI_BASE_URL || 'https://sandbox.wompi.co/v1',
    eventsUrl: process.env.WOMPI_EVENTS_URL || 'https://sandbox.wompi.co/v1/events',
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
}));