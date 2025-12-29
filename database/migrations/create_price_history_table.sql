-- Price History Table for tracking NAV/price changes over time
-- This is useful for mutual funds where unit price changes but holdings remain constant

CREATE TABLE IF NOT EXISTS personal_finance.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    security_name TEXT,
    price DECIMAL(15, 4) NOT NULL,
    price_date DATE NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CAD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, price_date, currency)
);

-- Index for quick lookups by symbol and date
CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON personal_finance.price_history(symbol);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON personal_finance.price_history(price_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_symbol_date ON personal_finance.price_history(symbol, price_date DESC);

COMMENT ON TABLE personal_finance.price_history IS 'Historical NAV/price data for securities, particularly useful for mutual funds';

-- No user_id column - prices are universal
-- No RLS needed - this is reference data accessible to all users
