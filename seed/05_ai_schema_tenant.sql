-- ================================================================
-- AI Tenant Tables — run inside tenant schemas
-- ================================================================
-- For each active tenant, run:
-- SET search_path TO tenant_{slug};

CREATE TABLE IF NOT EXISTS ai_conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID,
  surface               VARCHAR(20) NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'active',
  last_intent           VARCHAR(60),
  emergency_flagged     BOOLEAN NOT NULL DEFAULT FALSE,
  linked_appointment_id UUID,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL,
  role                VARCHAR(20) NOT NULL,
  content             TEXT NOT NULL,
  intent              VARCHAR(60),
  intent_confidence   DECIMAL(4,3),
  emergency_detected  BOOLEAN NOT NULL DEFAULT FALSE,
  prompt_tokens       INT NOT NULL DEFAULT 0,
  completion_tokens   INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS soap_drafts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id              UUID NOT NULL,
  appointment_id      UUID,
  veterinarian_id     UUID NOT NULL,
  input_type          VARCHAR(20) NOT NULL,
  raw_input           TEXT,
  media_url           TEXT,
  transcript          TEXT,
  soap_json           JSONB,
  client_summary      JSONB,
  uncertain_sections  JSONB NOT NULL DEFAULT '[]',
  overall_confidence  DECIMAL(4,3),
  status              VARCHAR(20) NOT NULL DEFAULT 'draft',
  approved_by         UUID,
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  was_edited          BOOLEAN NOT NULL DEFAULT FALSE,
  portal_published    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_interpretations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id       UUID NOT NULL UNIQUE,
  pet_id                  UUID NOT NULL,
  abnormal_values         JSONB NOT NULL DEFAULT '[]',
  overall_severity        VARCHAR(20) NOT NULL DEFAULT 'normal',
  plain_language_summary  TEXT,
  clinical_summary        TEXT,
  recommended_actions     JSONB NOT NULL DEFAULT '[]',
  vet_approved            BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by             UUID,
  portal_published        BOOLEAN NOT NULL DEFAULT FALSE,
  confidence_score        DECIMAL(4,3),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_transcripts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_call_sid       VARCHAR(60) NOT NULL UNIQUE,
  caller_phone          VARCHAR(30) NOT NULL,
  user_id               UUID,
  duration_seconds      INT NOT NULL DEFAULT 0,
  transcript            TEXT,
  intent                VARCHAR(60),
  outcome               VARCHAR(60),
  linked_appointment_id UUID,
  emergency_flagged     BOOLEAN NOT NULL DEFAULT FALSE,
  ai_booked             BOOLEAN NOT NULL DEFAULT FALSE,
  transferred_to_staff  BOOLEAN NOT NULL DEFAULT FALSE,
  conversation_turns    JSONB NOT NULL DEFAULT '[]',
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_actions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger               VARCHAR(60) NOT NULL,
  action_type           VARCHAR(60) NOT NULL,
  resource_type         VARCHAR(60),
  resource_id           UUID,
  ai_generated_content  TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending',
  executed_at           TIMESTAMPTZ,
  overridden_by         UUID,
  override_reason       TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category            VARCHAR(60) NOT NULL,
  severity            VARCHAR(20) NOT NULL DEFAULT 'info',
  title               VARCHAR(300) NOT NULL,
  explanation         TEXT NOT NULL,
  supporting_data     JSONB NOT NULL DEFAULT '{}',
  recommended_action  TEXT,
  confidence          DECIMAL(4,3) NOT NULL DEFAULT 0,
  is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed        BOOLEAN NOT NULL DEFAULT FALSE,
  generated_for_date  DATE NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
