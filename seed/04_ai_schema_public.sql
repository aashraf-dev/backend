-- ================================================================
-- AI Platform Tables
-- Run after 01_platform_seed.sql
-- ================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  user_id          UUID,
  feature          VARCHAR(60) NOT NULL,
  model            VARCHAR(60) NOT NULL DEFAULT 'gpt-4o',
  prompt_tokens    INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens     INT NOT NULL DEFAULT 0,
  cost_usd         DECIMAL(10,6) NOT NULL DEFAULT 0,
  duration_ms      INT,
  cache_hit        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_quotas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  period_start      DATE NOT NULL,
  monthly_limit_usd DECIMAL(8,2) NOT NULL DEFAULT 15,
  consumed_usd      DECIMAL(10,6) NOT NULL DEFAULT 0,
  is_exceeded       BOOLEAN NOT NULL DEFAULT FALSE,
  features_enabled  JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_date ON public.ai_usage_logs(tenant_id, created_at);

-- Seed initial quotas for existing tenants
INSERT INTO public.ai_quotas (tenant_id, period_start, monthly_limit_usd)
SELECT id, DATE_TRUNC('month', NOW())::date, 20
FROM public.tenants
WHERE status = 'active'
ON CONFLICT (tenant_id, period_start) DO NOTHING;

COMMIT;
