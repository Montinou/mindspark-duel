-- CHECK constraints for card stats (cost, power, defense must be 1-10)
-- Drizzle ORM doesn't support CHECK constraints natively, so we add them manually

-- Drop constraints if they exist (for idempotency)
DO $$ BEGIN
  ALTER TABLE cards DROP CONSTRAINT IF EXISTS chk_cost;
  ALTER TABLE cards DROP CONSTRAINT IF EXISTS chk_power;
  ALTER TABLE cards DROP CONSTRAINT IF EXISTS chk_defense;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Add CHECK constraints
ALTER TABLE cards ADD CONSTRAINT chk_cost CHECK (cost >= 1 AND cost <= 10);
ALTER TABLE cards ADD CONSTRAINT chk_power CHECK (power >= 1 AND power <= 10);
ALTER TABLE cards ADD CONSTRAINT chk_defense CHECK (defense >= 1 AND defense <= 10);
