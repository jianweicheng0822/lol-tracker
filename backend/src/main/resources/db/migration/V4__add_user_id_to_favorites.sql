ALTER TABLE favorite_players ADD COLUMN user_id BIGINT;

DELETE FROM favorite_players WHERE user_id IS NULL;

ALTER TABLE favorite_players ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE favorite_players
    ADD CONSTRAINT fk_favorite_players_user
    FOREIGN KEY (user_id) REFERENCES app_users(id);

ALTER TABLE favorite_players
    ADD CONSTRAINT uq_favorite_players_user_puuid
    UNIQUE (user_id, puuid);
