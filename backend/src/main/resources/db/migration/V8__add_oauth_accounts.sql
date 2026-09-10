ALTER TABLE app_users ADD COLUMN email VARCHAR(255);
CREATE UNIQUE INDEX uq_app_users_email ON app_users (email) WHERE email IS NOT NULL;

CREATE TABLE oauth_accounts (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    provider    VARCHAR(20)  NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_oauth_provider_id ON oauth_accounts (provider, provider_id);
CREATE INDEX idx_oauth_user ON oauth_accounts (user_id);
