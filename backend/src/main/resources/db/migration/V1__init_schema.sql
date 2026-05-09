-- V1: Initial schema matching existing JPA entities

CREATE TABLE app_users (
    id          BIGSERIAL PRIMARY KEY,
    session_id  VARCHAR(255) UNIQUE NOT NULL,
    tier        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE favorite_players (
    id        BIGSERIAL PRIMARY KEY,
    puuid     VARCHAR(255) NOT NULL,
    game_name VARCHAR(255) NOT NULL,
    tag_line  VARCHAR(255) NOT NULL,
    region    VARCHAR(50)  NOT NULL,
    saved_at  TIMESTAMP    NOT NULL
);

CREATE TABLE lp_snapshots (
    id             BIGSERIAL PRIMARY KEY,
    puuid          VARCHAR(255) NOT NULL,
    queue_type     VARCHAR(255) NOT NULL,
    tier           VARCHAR(50)  NOT NULL,
    rank_division  VARCHAR(10)  NOT NULL,
    league_points  INTEGER      NOT NULL DEFAULT 0,
    captured_at    BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE match_records (
    id                             BIGSERIAL PRIMARY KEY,
    puuid                          VARCHAR(255) NOT NULL,
    match_id                       VARCHAR(255) NOT NULL,
    region                         VARCHAR(50)  NOT NULL,
    champion_name                  VARCHAR(255) NOT NULL,
    kills                          INTEGER NOT NULL DEFAULT 0,
    deaths                         INTEGER NOT NULL DEFAULT 0,
    assists                        INTEGER NOT NULL DEFAULT 0,
    win                            BOOLEAN NOT NULL DEFAULT FALSE,
    game_duration_sec              BIGINT  NOT NULL DEFAULT 0,
    game_end_timestamp             BIGINT  NOT NULL DEFAULT 0,
    queue_id                       INTEGER NOT NULL DEFAULT 0,
    total_damage_dealt_to_champions INTEGER NOT NULL DEFAULT 0,
    gold_earned                    INTEGER NOT NULL DEFAULT 0,
    total_minions_killed           INTEGER NOT NULL DEFAULT 0,
    neutral_minions_killed         INTEGER NOT NULL DEFAULT 0,
    placement                      INTEGER NOT NULL DEFAULT 0,
    team_total_kills               INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_match_records_puuid_match UNIQUE (puuid, match_id)
);

CREATE INDEX idx_match_records_puuid ON match_records (puuid);
CREATE INDEX idx_lp_snapshots_puuid_queue ON lp_snapshots (puuid, queue_type);
CREATE INDEX idx_favorite_players_puuid ON favorite_players (puuid);
