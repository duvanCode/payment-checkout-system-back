import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';
import { TRANSACTION_REPOSITORY } from '../../application/ports/transaction.repository.port';
import type { PaymentGatewayPort } from '../../application/ports/payment-gateway.port';
import { PAYMENT_GATEWAY } from '../../application/ports/payment-gateway.port';
import { UpdateStockUseCase } from '../../application/use-cases/update-stock.use-case';
import type { DeliveryRepositoryPort } from '../../application/ports/delivery.repository.port';
import { DELIVERY_REPOSITORY } from '../../application/ports/delivery.repository.port';
import { Delivery } from '../../domain/entities/delivery.entity';

@Injectable()
export class TransactionSyncService implements OnModuleInit {
    private readonly logger = new Logger(TransactionSyncService.name);
    private isProcessing = false;
    private readonly intervalSeconds: number;

    constructor(
        @Inject(TRANSACTION_REPOSITORY)
        private readonly transactionRepository: TransactionRepositoryPort,
        @Inject(PAYMENT_GATEWAY)
        private readonly paymentGateway: PaymentGatewayPort,
        @Inject(DELIVERY_REPOSITORY)
        private readonly deliveryRepository: DeliveryRepositoryPort,
        private readonly updateStockUseCase: UpdateStockUseCase,
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) {
        this.intervalSeconds = parseInt(
            this.configService.get<string>('TRANSACTION_SYNC_INTERVAL_SECONDS', '300'),
            10,
        );

        this.logger.log('═══════════════════════════════════════════════════');
        this.logger.log('✅ Transaction Sync Service initialized');
        this.logger.log(`📅 Job schedule: Every ${this.intervalSeconds} seconds`);
        this.logger.log('🔄 Status: ACTIVE');
        this.logger.log('═══════════════════════════════════════════════════');
    }

    onModuleInit() {
        const intervalMs = this.intervalSeconds * 1000;
        const interval = setInterval(() => {
            this.syncPendingTransactions();
        }, intervalMs);

        this.schedulerRegistry.addInterval('transaction-sync', interval);
    }

    /**
     * Job que sincroniza transacciones pendientes con Wompi
     * La frecuencia se configura mediante TRANSACTION_SYNC_INTERVAL_SECONDS en .env
     */
    async syncPendingTransactions(): Promise<void> {
        // Evitar ejecuciones concurrentes
        if (this.isProcessing) {
            this.logger.warn('Transaction sync is already running, skipping this execution');
            return;
        }

        try {
            this.isProcessing = true;
            const startTime = new Date();
            this.logger.log('═══════════════════════════════════════════════════');
            this.logger.log('🔄 Starting transaction synchronization job');
            this.logger.log(`⏰ Execution time: ${startTime.toISOString()}`);
            this.logger.log('═══════════════════════════════════════════════════');

            // Obtener todas las transacciones pendientes
            const pendingResult = await this.transactionRepository.findPendingTransactions();

            if (pendingResult.isFailure) {
                this.logger.error(`Failed to fetch pending transactions: ${pendingResult.getError()}`);
                return;
            }

            const pendingTransactions = pendingResult.getValue();

            if (pendingTransactions.length === 0) {
                this.logger.log('✅ No pending transactions to sync');
                this.logger.log('═══════════════════════════════════════════════════\n');
                return;
            }

            this.logger.log(`📋 Found ${pendingTransactions.length} pending transaction(s) to sync`);

            // Procesar cada transacción pendiente
            let successCount = 0;
            let errorCount = 0;

            for (const transaction of pendingTransactions) {
                try {
                    await this.syncTransaction(transaction);
                    successCount++;
                } catch (error) {
                    this.logger.error(
                        `Error syncing transaction ${transaction.getTransactionNumber()}: ${error.message}`,
                        error.stack,
                    );
                    errorCount++;
                }
            }

            this.logger.log('═══════════════════════════════════════════════════');
            this.logger.log(`✅ Transaction sync completed`);
            this.logger.log(`   Success: ${successCount}`);
            this.logger.log(`   Errors: ${errorCount}`);
            this.logger.log('═══════════════════════════════════════════════════\n');
        } catch (error) {
            this.logger.error('Fatal error in transaction sync job', error.stack);
        } finally {
            this.isProcessing = false;
        }
    }

    private async syncTransaction(transaction: any): Promise<void> {
        const serviceTransactionId = transaction.toJSON().serviceTransactionId;

        if (!serviceTransactionId) {
            this.logger.warn(
                `Transaction ${transaction.getTransactionNumber()} has no service transaction ID, skipping`,
            );
            return;
        }

        this.logger.log(`🔍 Syncing transaction: ${transaction.getTransactionNumber()}`);
        this.logger.log(`   Service Transaction ID: ${serviceTransactionId}`);

        // Consultar el estado actual en Wompi
        const serviceResult = await this.paymentGateway.getTransaction(serviceTransactionId);

        if (serviceResult.isFailure) {
            this.logger.error(
                `Failed to get transaction from Wompi: ${serviceResult.getError()}`,
            );
            return;
        }

        const serviceTransaction = serviceResult.getValue();
        this.logger.log(`   Current Wompi Status: ${serviceTransaction.status}`);

        // Actualizar la transacción con el estado de Wompi
        transaction.updateFromService(
            serviceTransaction.transactionId,
            serviceTransaction.status,
        );

        const updateResult = await this.transactionRepository.update(transaction);

        if (updateResult.isFailure) {
            this.logger.error(
                `Failed to update transaction: ${updateResult.getError()}`,
            );
            return;
        }

        const updatedTransaction = updateResult.getValue();
        this.logger.log(`   Updated Transaction Status: ${updatedTransaction.getStatus()}`);

        console.log('🔍 [SYNC JOB] Checking if transaction is approved');
        console.log('🔍 [SYNC JOB] Transaction status:', updatedTransaction.getStatus());
        console.log('🔍 [SYNC JOB] isApproved():', updatedTransaction.isApproved());

        // Si la transacción fue aprobada, procesar el delivery y actualizar stock
        if (updatedTransaction.isApproved()) {
            console.log('✅ [SYNC JOB] Transaction is APPROVED, processing stock update and delivery');
            await this.processApprovedTransaction(updatedTransaction);
        } else {
            console.log('⏭️  [SYNC JOB] Transaction is NOT approved, skipping stock update');
        }

        this.logger.log(`✅ Transaction ${transaction.getTransactionNumber()} synced successfully`);
    }

    private async processApprovedTransaction(transaction: any): Promise<void> {
        this.logger.log(`📦 Processing approved transaction: ${transaction.getTransactionNumber()}`);

        const transactionData = transaction.toJSON();

        // Verificar si ya existe un delivery para esta transacción
        const existingDeliveryResult = await this.deliveryRepository.findByTransactionId(
            transaction.getId(),
        );

        if (existingDeliveryResult.isSuccess) {
            this.logger.log(`   ℹ️  Delivery already exists for this transaction, skipping processing`);
            return;
        }

        // Actualizar stock for each item
        try {
            const items = transaction.getItems();
            console.log('📦 [SYNC JOB] Transaction has', items.length, 'items to process');

            for (const item of items) {
                console.log('📦 [SYNC JOB] Processing item - ProductID:', item.getProductId(), 'Quantity:', item.getQuantity());

                const stockResult = await this.updateStockUseCase.execute(
                    item.getProductId(),
                    item.getQuantity(),
                );

                if (stockResult.isFailure) {
                    console.error('❌ [SYNC JOB] Stock update FAILED:', stockResult.getError());
                    this.logger.error(
                        `Failed to update stock for product ${item.getProductId()} in transaction ${transaction.getTransactionNumber()}: ${stockResult.getError()}`,
                    );
                    // Continuar con los demás productos incluso si uno falla
                } else {
                    console.log('✅ [SYNC JOB] Stock updated successfully for product:', item.getProductId());
                    this.logger.log(`   ✅ Stock updated for product ${item.getProductId()}`);
                }
            }

        } catch (error) {
            this.logger.error(
                `Error updating stock: ${error.message}`,
                error.stack,
            );
            return;
        }

        // Crear delivery
        try {
            // Usar valores por defecto ya que la información de dirección viene en el webhook
            // que Wompi envía, pero en la consulta directa no siempre está disponible
            const delivery = new Delivery(
                undefined,
                transaction.getId(),
                'Address not available',
                'City not available',
                'Department not available',
                Delivery.generateTrackingNumber(),
                Delivery.calculateEstimatedDelivery('bogotá'),
                new Date(),
                new Date(),
            );

            const deliveryResult = await this.deliveryRepository.save(delivery);

            if (deliveryResult.isFailure) {
                this.logger.error(
                    `Failed to create delivery: ${deliveryResult.getError()}`,
                );
                return;
            }

            this.logger.log(`   ✅ Delivery created: ${deliveryResult.getValue().getTrackingNumber()}`);
        } catch (error) {
            this.logger.error(
                `Error creating delivery: ${error.message}`,
                error.stack,
            );
        }
    }
}
