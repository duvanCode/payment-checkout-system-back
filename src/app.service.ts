import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('');
  console.log('🚀 Application is running');
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`📋 API Endpoints:`);
  console.log(`   GET  http://localhost:${port}/api/products`);
  console.log(`   POST http://localhost:${port}/api/payments/calculate`);
  console.log(`   POST http://localhost:${port}/api/payments/process`);
  console.log(`   POST http://localhost:${port}/api/webhooks/service`);
  console.log('');
}

bootstrap();