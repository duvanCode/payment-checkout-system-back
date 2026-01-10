export class ServiceWebhookDto {
    event: string;
    data: {
        transaction: {
            id: string;
            amount_in_cents: number;
            reference: string;
            customer_email: string;
            currency: string;
            payment_method_type: string;
            redirect_url: string;
            status: string;
            status_message: string;
            created_at: string;
            finalized_at?: string;
            shipping_address?: any;
            payment_method?: {
                type: string;
                extra: {
                    bin: string;
                    name: string;
                    brand: string;
                    exp_year: string;
                    exp_month: string;
                    last_four: string;
                    card_holder: string;
                };
            };
        };
    };
    sent_at: string;
    timestamp: number;
    signature: {
        checksum: string;
        properties: string[];
    };
    environment: string;
}