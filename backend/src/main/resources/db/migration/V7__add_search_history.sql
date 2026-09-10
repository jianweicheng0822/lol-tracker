CREATE TABLE search_history (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    game_name   VARCHAR(255) NOT NULL,
    tag_line    VARCHAR(255) NOT NULL,
    region      VARCHAR(10)  NOT NULL,
    searched_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_search_history_user_player
    ON search_history (user_id, LOWER(game_name), LOWER(tag_line), LOWER(region));
CREATE INDEX idx_search_history_user_time
    ON search_history (user_id, searched_at DESC);
