export interface RevenueCatEvent {
  id: string;
  type:
    | 'INITIAL_PURCHASE'
    | 'RENEWAL'
    | 'PRODUCT_CHANGE'
    | 'CANCELLATION'
    | 'UNCANCELLATION'
    | 'BILLING_ISSUE'
    | 'SUBSCRIBER_ALIAS'
    | 'SUBSCRIPTION_PAUSED'
    | 'EXPIRATION'
    | 'TRANSFER';
  app_user_id: string;
  original_app_user_id?: string;
  product_id: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  period_type?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  auto_resume_at_ms?: number | null;
  store?: string;
  environment?: 'SANDBOX' | 'PRODUCTION';
}

export interface RevenueCatWebhookBody {
  api_version?: string;
  event: RevenueCatEvent;
}
