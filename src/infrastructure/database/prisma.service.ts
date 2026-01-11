import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

// Cargar variables de entorno antes de crear el adapter
config();

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
})

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            adapter,
            log: ['query', 'info', 'warn', 'error'],
            errorFormat: 'minimal'
        });
    }

    async onModuleInit() {
        await this.$connect();
        console.log('✅ Database connected');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        console.log('❌ Database disconnected');
    }
}