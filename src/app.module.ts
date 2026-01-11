import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import serviceConfig from './infrastructure/config/service.config';

// Database
import { PrismaService } from './infrastructure/database/prisma.service';

// Repositories
import { PrismaProductRepository } from './infrastructure/adapters/prisma-product.repository';
import { PrismaTransactionRepository } from './infrastructure/adapters/prisma-transaction.repository';
import { PrismaCustomerRepository } from './infrastructure/adapters/prisma-customer.repository';
import { PrismaDeliveryRepository } from './infrastructure/adapters/prisma-delivery.repository';
import { PRODUCT_REPOSITORY } from './application/ports/product.repository.port';
import { TRANSACTION_REPOSITORY } from './application/ports/transaction.repository.port';
import { CUSTOMER_REPOSITORY } from './application/ports/customer.repository.port';
import { DELIVERY_REPOSITORY } from './application/ports/delivery.repository.port';

// Payment Gateway
import { ServiceAdapter } from './infrastructure/adapters/service.adapter';
import { PAYMENT_GATEWAY } from './application/ports/payment-gateway.port';

// Use Cases
import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { CalculateSummaryUseCase } from './application/use-cases/calculate-summary.use-case';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case';
import { UpdateStockUseCase } from './application/use-cases/update-stock.use-case';
import { GetTransactionStatusUseCase } from './application/use-cases/get-transaction-status.use-case';

// Controllers
import { ProductsController } from './infrastructure/controllers/products.controller';
import { PaymentsController } from './infrastructure/controllers/payments.controller';
import { WebhooksController } from './infrastructure/controllers/webhooks.controller';

// Jobs
import { TransactionSyncService } from './infrastructure/jobs/transaction-sync.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [serviceConfig],
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    ProductsController,
    PaymentsController,
    WebhooksController,
  ],
  providers: [
    // Database
    PrismaService,

    // Repositories
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: PrismaTransactionRepository,
    },
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: PrismaCustomerRepository,
    },
    {
      provide: DELIVERY_REPOSITORY,
      useClass: PrismaDeliveryRepository,
    },

    // Payment Gateway
    {
      provide: PAYMENT_GATEWAY,
      useClass: ServiceAdapter,
    },

    // Use Cases
    GetProductsUseCase,
    CalculateSummaryUseCase,
    CreateTransactionUseCase,
    ProcessPaymentUseCase,
    UpdateStockUseCase,
    GetTransactionStatusUseCase,

    // Jobs
    TransactionSyncService,
  ],
})
export class AppModule { }