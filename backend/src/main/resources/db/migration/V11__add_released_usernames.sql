-- Usernames given up by a rename. Login tokens name the user by username and stay valid for 24h,
-- so a released name is held for that long: if someone else took it right away, the old owner's
-- unexpired tokens would log in as the new owner. The old owner may take it back.
CREATE TABLE released_usernames (
    username    VARCHAR(255) PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    released_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_released_usernames_released_at ON released_usernames (released_at);
