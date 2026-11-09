-- What visitors do on the site (page views and feature use), for the admin metrics page and the
-- daily digest email. visitor_id is a random id the browser keeps in localStorage, or a daily
-- hash of IP + user agent when there isn't one; raw IPs are never stored.
CREATE TABLE usage_events (
    id          BIGSERIAL PRIMARY KEY,
    event       VARCHAR(40)  NOT NULL,
    visitor_id  VARCHAR(64)  NOT NULL,
    username    VARCHAR(255),
    detail      VARCHAR(100),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_usage_events_created_at ON usage_events (created_at);
CREATE INDEX idx_usage_events_visitor ON usage_events (visitor_id, created_at);
CREATE INDEX idx_usage_events_username ON usage_events (username) WHERE username IS NOT NULL;
