BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('pix', 'credit_card');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payable_status') THEN
    CREATE TYPE payable_status AS ENUM ('paid', 'waiting_funds');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  amount INTEGER NOT NULL CHECK (amount > 0),
  description VARCHAR(255) NOT NULL CHECK (char_length(trim(description)) > 0),
  method payment_method NOT NULL,
  payer_name VARCHAR(255) NOT NULL CHECK (char_length(trim(payer_name)) > 0),
  payer_cpf CHAR(11) NOT NULL CHECK (payer_cpf ~ '^[0-9]{11}$'),
  card_last4 CHAR(4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (method = 'pix' AND card_last4 IS NULL)
    OR (method = 'credit_card' AND card_last4 ~ '^[0-9]{4}$')
  )
);

CREATE TABLE IF NOT EXISTS payables (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  gross_amount INTEGER NOT NULL CHECK (gross_amount > 0),
  fee_amount INTEGER NOT NULL CHECK (fee_amount >= 0),
  net_amount INTEGER NOT NULL CHECK (net_amount >= 0),
  fee_percentage NUMERIC(5,2) NOT NULL CHECK (fee_percentage >= 0),
  status payable_status NOT NULL,
  payment_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (gross_amount = fee_amount + net_amount)
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_method ON transactions (method);
CREATE INDEX IF NOT EXISTS idx_payables_status ON payables (status);
CREATE INDEX IF NOT EXISTS idx_payables_payment_date ON payables (payment_date);

COMMIT;
