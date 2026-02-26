-- Users table (already exists, included for reference)
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE,
    phone         VARCHAR(50)  UNIQUE,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id          SERIAL PRIMARY KEY,
    user_id     INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    type        VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    category    VARCHAR(100) NOT NULL DEFAULT 'Other',
    description TEXT,
    date        DATE        NOT NULL,
    source      VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'excel', 'receipt')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
    id             SERIAL PRIMARY KEY,
    transaction_id INT  REFERENCES transactions(id) ON DELETE SET NULL,
    user_id        INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url      TEXT,
    ocr_raw_text   TEXT,
    processed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Forecasts cache
CREATE TABLE IF NOT EXISTS forecasts (
    id                 SERIAL PRIMARY KEY,
    user_id            INT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month              DATE    NOT NULL,
    predicted_income   NUMERIC(15,2),
    predicted_expense  NUMERIC(15,2),
    confidence_lower   NUMERIC(15,2),
    confidence_upper   NUMERIC(15,2),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- Tax settings
CREATE TABLE IF NOT EXISTS tax_settings (
    id                    SERIAL PRIMARY KEY,
    user_id               INT     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tax_rate              NUMERIC(5,2) NOT NULL DEFAULT 20.0,
    business_type         VARCHAR(100) NOT NULL DEFAULT 'general',
    quarterly_start_month INT     NOT NULL DEFAULT 1 CHECK (quarterly_start_month BETWEEN 1 AND 12),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
