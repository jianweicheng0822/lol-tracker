CREATE TABLE tracked_players (
    id               BIGSERIAL PRIMARY KEY,
    puuid            VARCHAR(78) NOT NULL UNIQUE,
    region           VARCHAR(10) NOT NULL,
    game_name        VARCHAR(100),
    tag_line         VARCHAR(10),
    last_ingested_at BIGINT NOT NULL DEFAULT 0,
    last_searched_at BIGINT NOT NULL DEFAULT 0,
    next_ingest_at   BIGINT NOT NULL DEFAULT 0,
    enabled          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_tracked_next ON tracked_players (next_ingest_at) WHERE enabled = TRUE;
