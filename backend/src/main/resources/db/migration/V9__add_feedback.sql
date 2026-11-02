CREATE TABLE feedback (
    id          BIGSERIAL PRIMARY KEY,
    type        VARCHAR(10)   NOT NULL,
    message     VARCHAR(1000) NOT NULL,
    email       VARCHAR(254),
    username    VARCHAR(255),
    page_url    VARCHAR(500),
    user_agent  VARCHAR(300),
    resolved    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_feedback_created_at ON feedback (created_at DESC);
