import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Limpiar datos existentes
    await prisma.delivery.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.deleteMany();

    // Crear productos de ejemplo
    const products = await Promise.all([
        prisma.product.create({
            data: {
                name: 'Laptop HP Pavilion 15',
                description: 'Laptop HP Pavilion 15.6" Intel Core i5, 8GB RAM, 256GB SSD, Windows 11',
                price: 1899000,
                stock: 15,
                imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Mouse Logitech MX Master 3',
                description: 'Mouse inalámbrico ergonómico con precisión avanzada y conexión múltiple',
                price: 349000,
                stock: 30,
                imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Teclado Mecánico Keychron K2',
                description: 'Teclado mecánico compacto 75% con switches Gateron Brown y retroiluminación RGB',
                price: 429000,
                stock: 20,
                imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Monitor LG UltraWide 29"',
                description: 'Monitor LG 29" UltraWide FHD IPS, 75Hz, FreeSync, HDR10',
                price: 899000,
                stock: 10,
                imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Webcam Logitech C920 HD Pro',
                description: 'Webcam Full HD 1080p con micrófono estéreo y corrección automática de luz',
                price: 299000,
                stock: 25,
                imageUrl: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=500',
            },
        }),
    ]);

    console.log(`✅ Created ${products.length} products`);

    const customer = await prisma.customer.create({
        data: {
            email: 'john.doe@example.com',
            phone: '+573001234567',
            fullName: 'John Doe',
        },
    });

    console.log(`✅ Created customer: ${customer.email}`);

    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });