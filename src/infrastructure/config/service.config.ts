import { registerAs } from '@nestjs/config';

export default registerAs('service', () => ({
    publicKey: process.env.PUBLIC_KEY,
    privateKey: process.env.PRIVATE_KEY,
    baseUrl: process.env.BASE_URL || 'https://sandbox.service.co/v1',
    eventsUrl: process.env.EVENTS_URL || 'https://sandbox.service.co/v1/events',
    integritySecret: process.env.INTEGRITY_SECRET || '',
}));