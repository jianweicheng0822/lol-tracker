-- V5: Add Stripe subscription fields to app_users

ALTER TABLE app_users ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE app_users ADD COLUMN stripe_subscription_id VARCHAR(255);
ALTER TABLE app_users ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'none' NOT NULL;
