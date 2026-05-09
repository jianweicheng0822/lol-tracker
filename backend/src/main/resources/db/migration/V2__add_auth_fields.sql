-- V2: Add authentication fields to app_users

ALTER TABLE app_users ADD COLUMN username VARCHAR(255);
ALTER TABLE app_users ADD COLUMN password VARCHAR(255);
ALTER TABLE app_users ALTER COLUMN session_id DROP NOT NULL;

CREATE UNIQUE INDEX idx_app_users_username ON app_users (username) WHERE username IS NOT NULL;
