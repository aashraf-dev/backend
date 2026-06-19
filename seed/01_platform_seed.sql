-- =============================================================
-- Vetos Platform — Realistic Seed Data
-- Run order: this file first, then 02_tenant_happypaws.sql,
-- then 03_tenant_greenleaf.sql
-- Passwords are bcrypt hashes of the plaintext shown in comments
-- =============================================================

select distinct(schemaname) from pg_tables; where schemaname = 'public';

select * from platform_users;
select * from platform_sessions;
select * from platform_audit_logs;
select * from tenants;



--rollback;

--update tenants  set status = 'pending';

BEGIN;

-- ── Platform users ────────────────────────────────────────────

-- superadmin@vetos.com / Admin@123456
INSERT INTO public.platform_users (
  id, email, password_hash, first_name, last_name,
  user_type, is_active, mfa_enabled,
  created_at, updated_at
) VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'superadmin@vetos.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcan.BEsq8jQrRCkRSBXy',
  'Alex', 'Morgan',
  'platform_super_admin', true, false,
  NOW() - INTERVAL '180 days', NOW()
);

-- support1@vetos.com / Support@123456
INSERT INTO public.platform_users (
  id, email, password_hash, first_name, last_name,
  user_type, is_active, mfa_enabled,
  created_at, updated_at
) VALUES (
  'a1000000-0000-0000-0000-000000000002',
  'support1@vetos.com',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHOZTjO2a',
  'Sarah', 'Chen',
  'platform_support', true, false,
  NOW() - INTERVAL '90 days', NOW()
);

-- support2@vetos.com / Support@123456
INSERT INTO public.platform_users (
  id, email, password_hash, first_name, last_name,
  user_type, is_active, mfa_enabled,
  last_login_at, created_at, updated_at
) VALUES (
  'a1000000-0000-0000-0000-000000000003',
  'support2@vetos.com',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHOZTjO2a',
  'Marcus', 'Rivera',
  'platform_support', true, false,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '60 days', NOW()
);

-- ── Tenants ───────────────────────────────────────────────────

INSERT INTO public.tenants (
  id, name, slug, schema_name, status, subscription_plan,
  subscription_expires_at, contact_email, contact_phone,
  address, city, country, timezone, locale, settings,
  schema_provisioned_at, last_active_at, created_at, updated_at
) VALUES (
  'b2000000-0000-0000-0000-000000000001',
  'Happy Paws Veterinary Clinic',
  'happypaws',
  'tenant_happypaws',
  'active',
  'professional',
  NOW() + INTERVAL '11 months',
  'clinic@happypaws.com',
  '+12125550101',
  '247 West 35th Street, Suite 200',
  'New York',
  'US',
  'America/New_York',
  'en-US',
  '{"features":{"onlineBooking":true,"smsReminders":true,"labIntegration":false}}',
  NOW() - INTERVAL '120 days',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '120 days',
  NOW()
),
(
  'b2000000-0000-0000-0000-000000000002',
  'Green Leaf Animal Hospital',
  'greenleaf',
  'tenant_greenleaf',
  'active',
  'starter',
  NOW() + INTERVAL '5 months',
  'admin@greenleafah.com',
  '+13105550202',
  '88 Ocean Avenue',
  'Los Angeles',
  'US',
  'America/Los_Angeles',
  'en-US',
  '{"features":{"onlineBooking":true,"smsReminders":false,"labIntegration":false}}',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '45 days',
  NOW()
),
(
  'b2000000-0000-0000-0000-000000000003',
  'Paws & Claws Veterinary Practice',
  'pawsclaws',
  'tenant_pawsclaws',
  'suspended',
  'trial',
  NOW() - INTERVAL '5 days',
  'info@pawsandclaws.vet',
  '+17735550303',
  '500 N Michigan Avenue',
  'Chicago',
  'US',
  'America/Chicago',
  'en-US',
  '{}',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '20 days',
  NOW()
),
(
  'b2000000-0000-0000-0000-000000000004',
  'Sunrise Pet Care Center',
  'sunrisepet',
  'tenant_sunrisepet',
  'pending',
  'trial',
  NULL,
  'hello@sunrisepetcare.com',
  '+16175550404',
  '10 Boylston Street',
  'Boston',
  'US',
  'America/New_York',
  'en-US',
  '{}',
  NULL,
  NULL,
  NOW() - INTERVAL '2 days',
  NOW()
);

-- ── Platform audit logs ───────────────────────────────────────

INSERT INTO public.platform_audit_logs (
  id, actor_id, tenant_id, app_context,
  action, resource_type, resource_id,
  metadata, ip_address, request_id, created_at
) VALUES
(
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',
  NULL,
  'admin',
  'POST /api/v1/admin/tenants',
  'tenant',
  'b2000000-0000-0000-0000-000000000001',
  '{"outcome":"SUCCESS","durationMs":1842}',
  '203.0.113.10',
  gen_random_uuid()::text,
  NOW() - INTERVAL '120 days'
),
(
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',
  NULL,
  'admin',
  'POST /api/v1/admin/tenants',
  'tenant',
  'b2000000-0000-0000-0000-000000000002',
  '{"outcome":"SUCCESS","durationMs":1654}',
  '203.0.113.10',
  gen_random_uuid()::text,
  NOW() - INTERVAL '45 days'
),
(
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000003',
  'admin',
  'POST /api/v1/admin/tenants/:id/suspend',
  'tenant',
  'b2000000-0000-0000-0000-000000000003',
  '{"outcome":"SUCCESS","durationMs":234,"reason":"Trial expired"}',
  '203.0.113.10',
  gen_random_uuid()::text,
  NOW() - INTERVAL '8 days'
),
(
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000001',
  'admin',
  'PATCH /api/v1/admin/tenants/:id/subscription',
  'tenant',
  'b2000000-0000-0000-0000-000000000001',
  '{"outcome":"SUCCESS","durationMs":198,"plan":"professional"}',
  '198.51.100.22',
  gen_random_uuid()::text,
  NOW() - INTERVAL '30 days'
);

COMMIT;
