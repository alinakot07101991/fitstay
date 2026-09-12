CREATE TABLE IF NOT EXISTS provider_daily_usage (
  provider TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, day_utc)
);
