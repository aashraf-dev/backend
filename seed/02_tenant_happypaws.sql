-- =============================================================
-- Tenant: Happy Paws Veterinary Clinic (tenant_happypaws schema)
-- =============================================================

BEGIN;

SET search_path TO tenant_happypaws;

-- ── Permissions (seeded by provisioning, shown for reference) ──
-- These are created by TenantProvisioningService.provision()
-- Only inserting a subset here for brevity — provisioning seeds all

-- ── Roles (system roles) ─────────────────────────────────────

INSERT INTO tenant_happypaws.roles (id, name, display_name, description, is_system, is_active, created_at, updated_at)
VALUES
  ('c3000001-0000-0000-0000-000000000001', 'clinic_owner',   'Clinic Owner',   'Full clinic administration access',              true, true, NOW() - INTERVAL '120 days', NOW()),
  ('c3000001-0000-0000-0000-000000000002', 'clinic_manager', 'Clinic Manager', 'Manage staff, schedule and reports',             true, true, NOW() - INTERVAL '120 days', NOW()),
  ('c3000001-0000-0000-0000-000000000003', 'veterinarian',   'Veterinarian',   'Full patient access and clinical capabilities',  true, true, NOW() - INTERVAL '120 days', NOW()),
  ('c3000001-0000-0000-0000-000000000004', 'vet_intern',     'Vet Intern',     'Read-only clinical access',                      true, true, NOW() - INTERVAL '120 days', NOW()),
  ('c3000001-0000-0000-0000-000000000005', 'receptionist',   'Receptionist',   'Appointments and basic patient info',            true, true, NOW() - INTERVAL '120 days', NOW()),
  ('c3000001-0000-0000-0000-000000000006', 'billing_staff',  'Billing Staff',  'Billing and financial reports',                  true, true, NOW() - INTERVAL '120 days', NOW()),
  ('c3000001-0000-0000-0000-000000000007', 'pet_owner',      'Pet Owner',      'Client portal access — own pets only',           true, true, NOW() - INTERVAL '120 days', NOW());

-- ── Departments ───────────────────────────────────────────────

INSERT INTO tenant_happypaws.departments (id, name, description, is_active, created_at, updated_at)
VALUES
  ('d4000001-0000-0000-0000-000000000001', 'General Practice',   'Routine wellness exams and general medicine',           true, NOW() - INTERVAL '120 days', NOW()),
  ('d4000001-0000-0000-0000-000000000002', 'Surgery',            'Elective and emergency surgical procedures',            true, NOW() - INTERVAL '120 days', NOW()),
  ('d4000001-0000-0000-0000-000000000003', 'Emergency & Triage', '24-hour urgent care and emergency stabilisation',      true, NOW() - INTERVAL '120 days', NOW()),
  ('d4000001-0000-0000-0000-000000000004', 'Dentistry',          'Dental cleaning, extraction and oral health',           true, NOW() - INTERVAL '90 days',  NOW()),
  ('d4000001-0000-0000-0000-000000000005', 'Administration',     'Front desk, billing and client communications',         true, NOW() - INTERVAL '120 days', NOW());

-- ── Designations ──────────────────────────────────────────────

INSERT INTO tenant_happypaws.designations (id, name, department_id, description, is_active, created_at, updated_at)
VALUES
  ('e5000001-0000-0000-0000-000000000001', 'Chief of Medicine',    NULL,                                          'Clinic owner and medical director',              true, NOW() - INTERVAL '120 days', NOW()),
  ('e5000001-0000-0000-0000-000000000002', 'Head Surgeon',         'd4000001-0000-0000-0000-000000000002',        'Lead surgeon overseeing surgical department',     true, NOW() - INTERVAL '120 days', NOW()),
  ('e5000001-0000-0000-0000-000000000003', 'Senior Veterinarian',  'd4000001-0000-0000-0000-000000000001',        'Experienced vet managing complex cases',          true, NOW() - INTERVAL '120 days', NOW()),
  ('e5000001-0000-0000-0000-000000000004', 'Emergency Vet',        'd4000001-0000-0000-0000-000000000003',        'Specialised in critical and emergency care',      true, NOW() - INTERVAL '90 days',  NOW()),
  ('e5000001-0000-0000-0000-000000000005', 'Vet Intern',           'd4000001-0000-0000-0000-000000000001',        'Supervised intern under board-certified mentor',  true, NOW() - INTERVAL '60 days',  NOW()),
  ('e5000001-0000-0000-0000-000000000006', 'Practice Manager',     'd4000001-0000-0000-0000-000000000005',        'Day-to-day operations and staff coordination',    true, NOW() - INTERVAL '120 days', NOW()),
  ('e5000001-0000-0000-0000-000000000007', 'Senior Receptionist',  'd4000001-0000-0000-0000-000000000005',        'Client relations and appointment scheduling',     true, NOW() - INTERVAL '120 days', NOW()),
  ('e5000001-0000-0000-0000-000000000008', 'Billing Coordinator',  'd4000001-0000-0000-0000-000000000005',        'Invoice management and insurance claims',         true, NOW() - INTERVAL '120 days', NOW());

-- ── Staff users ───────────────────────────────────────────────
-- All staff passwords: Staff@123456
-- Hash: $2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHOZTjO2a

INSERT INTO tenant_happypaws.users (
  id, email, password_hash, first_name, last_name,
  user_type, designation_id, is_active, is_email_verified,
  mfa_enabled, last_login_at, created_at, updated_at
) VALUES
-- Clinic owner
(
  'f6000001-0000-0000-0000-000000000001',
  'owner@happypaws.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcan.BEsq8jQrRCkRSBXy',
  'Jane', 'Smith',
  'clinic_owner',
  'e5000001-0000-0000-0000-000000000001',
  true, true, false,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '120 days', NOW()
),
-- Head surgeon
(
  'f6000001-0000-0000-0000-000000000002',
  'dr.wilson@happypaws.com',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHOZTjO2a',
  'Robert', 'Wilson',
  'veterinarian',
  'e5000001-0000-0000-0000-000000000002',
  true, true, false,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '118 days', NOW()
),
-- Senior vet
(
  'f6000001-0000-0000-0000-000000000003',
  'dr.chen@happypaws.com',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHOZTjO2a',
  'Linda', 'Chen',
  'veterinarian',
  'e5000001-0000-0000-0000-000000000003',
  true, true, false,
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '115 days', NOW()
),
-- Emergency vet
(
  'f6000001-0000-0000-0000-000000000004',
  'dr.okafor@happypaws.com',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHOZTjO2a',
  'Emeka', 'Okafor',
  'veterinarian',
  'e5000001-0000-0000-0000-000000000004',
  true, true, false,
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '88 days', NOW()
),
-- Vet intern
(
  'f6000001-0000-0000-0000-000000000005',
  'intern.patel@happypaws.com',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHOZTjO2a',
  'Priya', 'Patel',
  'vet_intern',
  'e5000001-0000-0000-0000-000000000005',
  true, true, false,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '55 days', NOW()
),
-- Practice manager
(
  'f6000001-0000-0000-0000-000000000006',
  'manager@happypaws.com',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHOZTjO2a',
  'Carlos', 'Mendez',
  'clinic_manager',
  'e5000001-0000-0000-0000-000000000006',
  true, true, false,
  NOW() - INTERVAL '4 hours',
  NOW() - INTERVAL '120 days', NOW()
),
-- Receptionist
(
  'f6000001-0000-0000-0000-000000000007',
  'reception@happypaws.com',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHOZTjO2a',
  'Amy', 'Nguyen',
  'receptionist',
  'e5000001-0000-0000-0000-000000000007',
  true, true, false,
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '100 days', NOW()
),
-- Billing staff
(
  'f6000001-0000-0000-0000-000000000008',
  'billing@happypaws.com',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHOZTjO2a',
  'Tom', 'Harrington',
  'billing_staff',
  'e5000001-0000-0000-0000-000000000008',
  true, true, false,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '110 days', NOW()
);

-- Pet owners (client portal users) / Owner@123456
INSERT INTO tenant_happypaws.users (
  id, email, password_hash, first_name, last_name,
  user_type, designation_id, is_active, is_email_verified,
  mfa_enabled, last_login_at, created_at, updated_at
) VALUES
(
  'f6000001-0000-0000-0000-000000000010',
  'michael.johnson@email.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcan.BEsq8jQrRCkRSBXy',
  'Michael', 'Johnson',
  'pet_owner', NULL,
  true, true, false,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '100 days', NOW()
),
(
  'f6000001-0000-0000-0000-000000000011',
  'sarah.kim@email.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcan.BEsq8jQrRCkRSBXy',
  'Sarah', 'Kim',
  'pet_owner', NULL,
  true, true, false,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '80 days', NOW()
),
(
  'f6000001-0000-0000-0000-000000000012',
  'david.torres@email.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcan.BEsq8jQrRCkRSBXy',
  'David', 'Torres',
  'pet_owner', NULL,
  true, true, false,
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '60 days', NOW()
),
(
  'f6000001-0000-0000-0000-000000000013',
  'emily.zhang@email.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcan.BEsq8jQrRCkRSBXy',
  'Emily', 'Zhang',
  'pet_owner', NULL,
  true, true, false,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '50 days', NOW()
),
(
  'f6000001-0000-0000-0000-000000000014',
  'james.oconnor@email.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcan.BEsq8jQrRCkRSBXy',
  'James', 'O''Connor',
  'pet_owner', NULL,
  true, true, false,
  NOW() - INTERVAL '14 days',
  NOW() - INTERVAL '40 days', NOW()
);

-- ── User roles ────────────────────────────────────────────────

INSERT INTO tenant_happypaws.user_roles (id, user_id, role_id, assigned_by, assigned_at) VALUES
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000001', 'c3000001-0000-0000-0000-000000000001', NULL,                                      NOW() - INTERVAL '120 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000002', 'c3000001-0000-0000-0000-000000000003', 'f6000001-0000-0000-0000-000000000001',    NOW() - INTERVAL '118 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000003', 'c3000001-0000-0000-0000-000000000003', 'f6000001-0000-0000-0000-000000000001',    NOW() - INTERVAL '115 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000004', 'c3000001-0000-0000-0000-000000000003', 'f6000001-0000-0000-0000-000000000001',    NOW() - INTERVAL '88 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000005', 'c3000001-0000-0000-0000-000000000004', 'f6000001-0000-0000-0000-000000000006',    NOW() - INTERVAL '55 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000006', 'c3000001-0000-0000-0000-000000000002', 'f6000001-0000-0000-0000-000000000001',    NOW() - INTERVAL '120 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000007', 'c3000001-0000-0000-0000-000000000005', 'f6000001-0000-0000-0000-000000000006',    NOW() - INTERVAL '100 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000008', 'c3000001-0000-0000-0000-000000000006', 'f6000001-0000-0000-0000-000000000006',    NOW() - INTERVAL '110 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000010', 'c3000001-0000-0000-0000-000000000007', NULL,                                      NOW() - INTERVAL '100 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000011', 'c3000001-0000-0000-0000-000000000007', NULL,                                      NOW() - INTERVAL '80 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000012', 'c3000001-0000-0000-0000-000000000007', NULL,                                      NOW() - INTERVAL '60 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000013', 'c3000001-0000-0000-0000-000000000007', NULL,                                      NOW() - INTERVAL '50 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000014', 'c3000001-0000-0000-0000-000000000007', NULL,                                      NOW() - INTERVAL '40 days');

-- ── User departments ──────────────────────────────────────────

INSERT INTO tenant_happypaws.user_departments (id, user_id, department_id, is_primary, assigned_by, assigned_at) VALUES
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000001', 'd4000001-0000-0000-0000-000000000001', true,  NULL,                                   NOW() - INTERVAL '120 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000002', 'd4000001-0000-0000-0000-000000000002', true,  'f6000001-0000-0000-0000-000000000001', NOW() - INTERVAL '118 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000003', 'd4000001-0000-0000-0000-000000000001', true,  'f6000001-0000-0000-0000-000000000001', NOW() - INTERVAL '115 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000004', 'd4000001-0000-0000-0000-000000000003', true,  'f6000001-0000-0000-0000-000000000001', NOW() - INTERVAL '88 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000005', 'd4000001-0000-0000-0000-000000000001', true,  'f6000001-0000-0000-0000-000000000006', NOW() - INTERVAL '55 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000006', 'd4000001-0000-0000-0000-000000000005', true,  'f6000001-0000-0000-0000-000000000001', NOW() - INTERVAL '120 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000007', 'd4000001-0000-0000-0000-000000000005', true,  'f6000001-0000-0000-0000-000000000006', NOW() - INTERVAL '100 days'),
  (gen_random_uuid(), 'f6000001-0000-0000-0000-000000000008', 'd4000001-0000-0000-0000-000000000005', true,  'f6000001-0000-0000-0000-000000000006', NOW() - INTERVAL '110 days');

-- ── Owner profiles ────────────────────────────────────────────

INSERT INTO tenant_happypaws.owner_profiles (
  id, user_id, phone, address_line1, city,
  postal_code, country, emergency_contact_name,
  emergency_contact_phone, marketing_consent,
  created_at, updated_at
) VALUES
(
  gen_random_uuid(), 'f6000001-0000-0000-0000-000000000010',
  '+12125550110', '84 West 3rd Street', 'New York',
  '10012', 'US', 'Lisa Johnson', '+12125550111', true,
  NOW() - INTERVAL '100 days', NOW()
),
(
  gen_random_uuid(), 'f6000001-0000-0000-0000-000000000011',
  '+12125550120', '320 East 46th Street, Apt 5B', 'New York',
  '10017', 'US', 'Brian Kim', '+12125550121', false,
  NOW() - INTERVAL '80 days', NOW()
),
(
  gen_random_uuid(), 'f6000001-0000-0000-0000-000000000012',
  '+12125550130', '156 Prince Street', 'New York',
  '10012', 'US', 'Maria Torres', '+12125550131', true,
  NOW() - INTERVAL '60 days', NOW()
),
(
  gen_random_uuid(), 'f6000001-0000-0000-0000-000000000013',
  '+12125550140', '88 Chambers Street, Apt 12', 'New York',
  '10007', 'US', 'Wei Zhang', '+12125550141', true,
  NOW() - INTERVAL '50 days', NOW()
),
(
  gen_random_uuid(), 'f6000001-0000-0000-0000-000000000014',
  '+12125550150', '412 Bleecker Street', 'New York',
  '10014', 'US', 'Fiona O''Connor', '+12125550151', false,
  NOW() - INTERVAL '40 days', NOW()
);

-- ── Clinic services ───────────────────────────────────────────

INSERT INTO tenant_happypaws.clinic_services (
  id, name, description, duration_minutes, price, is_active, category,
  created_at, updated_at
) VALUES
  ('g7000001-0000-0000-0000-000000000001', 'Annual Wellness Exam',          'Comprehensive physical exam, vaccinations review, parasite screening',              30,  89.00,  true, 'Wellness',    NOW() - INTERVAL '120 days', NOW()),
  ('g7000001-0000-0000-0000-000000000002', 'Puppy/Kitten Package',          'First exam, core vaccinations, deworming, microchip',                               45,  220.00, true, 'Wellness',    NOW() - INTERVAL '120 days', NOW()),
  ('g7000001-0000-0000-0000-000000000003', 'Dental Cleaning (Anaesthesia)', 'Full oral assessment, scaling, polishing under general anaesthesia',                180, 450.00, true, 'Dentistry',   NOW() - INTERVAL '90 days',  NOW()),
  ('g7000001-0000-0000-0000-000000000004', 'Spay / Neuter',                 'Elective sterilisation surgery including pre-op bloodwork',                         90,  380.00, true, 'Surgery',     NOW() - INTERVAL '120 days', NOW()),
  ('g7000001-0000-0000-0000-000000000005', 'Emergency Consultation',        'Priority assessment for urgent or critical cases',                                   30,  185.00, true, 'Emergency',   NOW() - INTERVAL '120 days', NOW()),
  ('g7000001-0000-0000-0000-000000000006', 'Dermatology Consultation',      'Skin, ear, and allergy assessment with cytology',                                   45,  145.00, true, 'Specialist',  NOW() - INTERVAL '60 days',  NOW()),
  ('g7000001-0000-0000-0000-000000000007', 'Radiology (X-Ray)',             'Digital radiography, up to 3 views',                                                20,  210.00, true, 'Diagnostics', NOW() - INTERVAL '120 days', NOW()),
  ('g7000001-0000-0000-0000-000000000008', 'Blood Panel & Urinalysis',      'CBC, chemistry panel, thyroid, urinalysis — next-day results',                      15,  175.00, true, 'Diagnostics', NOW() - INTERVAL '120 days', NOW()),
  ('g7000001-0000-0000-0000-000000000009', 'Vaccination (Core)',            'Individual core vaccine administration (rabies, DHPP, FVRCP)',                       15,  38.00,  true, 'Wellness',    NOW() - INTERVAL '120 days', NOW()),
  ('g7000001-0000-0000-0000-000000000010', 'Nail Trim & Ear Clean',         'Routine grooming services performed by veterinary technician',                      15,  28.00,  true, 'Grooming',    NOW() - INTERVAL '120 days', NOW());

-- ── Pets ──────────────────────────────────────────────────────

INSERT INTO tenant_happypaws.pets (
  id, owner_id, name, species, breed, date_of_birth,
  gender, color, weight_kg, microchip_id, is_neutered,
  is_deceased, profile_image_url, notes,
  created_at, updated_at
) VALUES
-- Michael Johnson's pets
(
  'h8000001-0000-0000-0000-000000000001',
  'f6000001-0000-0000-0000-000000000010',
  'Buddy', 'canine', 'Golden Retriever', '2019-04-12',
  'male', 'Golden', 34.2, '985112345678901', true, false,
  NULL, 'Friendly and energetic. History of seasonal allergies.',
  NOW() - INTERVAL '100 days', NOW()
),
(
  'h8000001-0000-0000-0000-000000000002',
  'f6000001-0000-0000-0000-000000000010',
  'Bella', 'feline', 'Domestic Shorthair', '2020-09-03',
  'female', 'Tortoiseshell', 4.1, '985112345678902', true, false,
  NULL, 'Indoor only. Slightly shy with new people.',
  NOW() - INTERVAL '100 days', NOW()
),
-- Sarah Kim's pets
(
  'h8000001-0000-0000-0000-000000000003',
  'f6000001-0000-0000-0000-000000000011',
  'Mochi', 'feline', 'Scottish Fold', '2021-02-14',
  'female', 'Grey and white', 3.8, '985112345678903', true, false,
  NULL, 'Very affectionate. Prefers to be handled gently.',
  NOW() - INTERVAL '80 days', NOW()
),
-- David Torres's pets
(
  'h8000001-0000-0000-0000-000000000004',
  'f6000001-0000-0000-0000-000000000012',
  'Max', 'canine', 'German Shepherd', '2018-07-22',
  'male', 'Black and tan', 38.5, '985112345678904', true, false,
  NULL, 'Well-trained. Prior ACL repair right hind leg (2022).',
  NOW() - INTERVAL '60 days', NOW()
),
(
  'h8000001-0000-0000-0000-000000000005',
  'f6000001-0000-0000-0000-000000000012',
  'Luna', 'canine', 'Labrador Mix', '2022-11-30',
  'female', 'Chocolate', 22.3, '985112345678905', false, false,
  NULL, 'Young and exuberant. Due for spay consultation.',
  NOW() - INTERVAL '60 days', NOW()
),
-- Emily Zhang's pets
(
  'h8000001-0000-0000-0000-000000000006',
  'f6000001-0000-0000-0000-000000000013',
  'Oliver', 'feline', 'Maine Coon', '2020-05-18',
  'male', 'Brown tabby', 6.9, '985112345678906', true, false,
  NULL, 'Large breed. Monitor for hypertrophic cardiomyopathy.',
  NOW() - INTERVAL '50 days', NOW()
),
-- James O'Connor's pets
(
  'h8000001-0000-0000-0000-000000000007',
  'f6000001-0000-0000-0000-000000000014',
  'Daisy', 'canine', 'Beagle', '2017-03-08',
  'female', 'Tricolor', 11.8, '985112345678907', true, false,
  NULL, 'Senior patient. Annual bloodwork recommended. Hypothyroidism — on Soloxine.',
  NOW() - INTERVAL '40 days', NOW()
),
(
  'h8000001-0000-0000-0000-000000000008',
  'f6000001-0000-0000-0000-000000000014',
  'Cleo', 'feline', 'Siamese', '2016-12-01',
  'female', 'Seal point', 3.4, '985112345678908', true, false,
  NULL, 'Senior. Managed chronic kidney disease stage 2. Low-phosphorus diet.',
  NOW() - INTERVAL '40 days', NOW()
);

-- ── Medical records ───────────────────────────────────────────

INSERT INTO tenant_happypaws.medical_records (
  id, pet_id, attending_vet_id, record_type, visit_date,
  chief_complaint, diagnosis, treatment, notes,
  weight_at_visit_kg, temperature_celsius, attachments,
  follow_up_date, created_at, updated_at
) VALUES
(
  'i9000001-0000-0000-0000-000000000001',
  'h8000001-0000-0000-0000-000000000001',
  'f6000001-0000-0000-0000-000000000003',
  'consultation',
  NOW() - INTERVAL '90 days',
  'Annual wellness exam',
  'Healthy adult canine. Mild otitis externa left ear.',
  'Ear cleaning performed. Prescribed Otomax ointment for 7 days.',
  'Owner educated on regular ear cleaning. Seasonal allergy discussed.',
  33.8, 38.4, '[]',
  (NOW() - INTERVAL '90 days' + INTERVAL '30 days')::date::text,
  NOW() - INTERVAL '90 days', NOW()
),
(
  'i9000001-0000-0000-0000-000000000002',
  'h8000001-0000-0000-0000-000000000001',
  'f6000001-0000-0000-0000-000000000003',
  'vaccination',
  NOW() - INTERVAL '90 days',
  'Routine vaccination update',
  'Vaccinations administered: Rabies, DHPP',
  'Rabies (1yr) and DHPP boosters given. Microchip confirmed.',
  'No adverse reaction. Next due date set.',
  33.8, 38.4, '[]',
  NULL,
  NOW() - INTERVAL '90 days', NOW()
),
(
  'i9000001-0000-0000-0000-000000000003',
  'h8000001-0000-0000-0000-000000000007',
  'f6000001-0000-0000-0000-000000000002',
  'consultation',
  NOW() - INTERVAL '35 days',
  'Routine senior wellness exam',
  'Hypothyroidism well-controlled on current dose. Mild dental calculus noted.',
  'Continue Soloxine 0.3mg twice daily. Recommend dental cleaning within 6 months.',
  'Blood panel results within normal limits. Owner consent for dental procedure obtained.',
  11.6, 38.2, '[]',
  (NOW() - INTERVAL '35 days' + INTERVAL '180 days')::date::text,
  NOW() - INTERVAL '35 days', NOW()
),
(
  'i9000001-0000-0000-0000-000000000004',
  'h8000001-0000-0000-0000-000000000008',
  'f6000001-0000-0000-0000-000000000003',
  'consultation',
  NOW() - INTERVAL '25 days',
  'Lethargy and reduced appetite for 3 days',
  'Chronic kidney disease Stage 2. Mild dehydration. BUN/Creatinine elevated.',
  'IV fluid therapy 60ml/kg over 4 hours in clinic. Adjusted to Royal Canin Renal diet.',
  'Recheck bloodwork in 4 weeks. Owner instructed on subcutaneous fluid administration.',
  3.2, 38.1, '[]',
  (NOW() - INTERVAL '25 days' + INTERVAL '28 days')::date::text,
  NOW() - INTERVAL '25 days', NOW()
),
(
  'i9000001-0000-0000-0000-000000000005',
  'h8000001-0000-0000-0000-000000000004',
  'f6000001-0000-0000-0000-000000000002',
  'consultation',
  NOW() - INTERVAL '15 days',
  'Intermittent hind limb lameness — right side',
  'Osteoarthritis right stifle, consistent with prior ACL repair. Grade 2/4 lameness.',
  'Carprofen 75mg once daily with food for 14 days. Rehabilitation exercises instructed.',
  'Joint supplement (Cosequin DS) recommended. Recheck if lameness persists beyond 3 weeks.',
  37.9, 38.6, '[]',
  (NOW() - INTERVAL '15 days' + INTERVAL '21 days')::date::text,
  NOW() - INTERVAL '15 days', NOW()
);

-- ── Prescriptions ─────────────────────────────────────────────

INSERT INTO tenant_happypaws.prescriptions (
  id, pet_id, prescribed_by_id, medical_record_id,
  medication_name, dosage, frequency, duration_days,
  instructions, start_date, end_date, status,
  refills_remaining, created_at, updated_at
) VALUES
(
  gen_random_uuid(),
  'h8000001-0000-0000-0000-000000000007',
  'f6000001-0000-0000-0000-000000000002',
  'i9000001-0000-0000-0000-000000000003',
  'Soloxine (Levothyroxine) 0.3mg',
  '0.3mg', 'Twice daily with food', NULL,
  'Administer consistently at the same times each day. Do not skip doses.',
  (NOW() - INTERVAL '35 days')::date::text,
  NULL,
  'active', 2,
  NOW() - INTERVAL '35 days', NOW()
),
(
  gen_random_uuid(),
  'h8000001-0000-0000-0000-000000000004',
  'f6000001-0000-0000-0000-000000000002',
  'i9000001-0000-0000-0000-000000000005',
  'Carprofen 75mg',
  '75mg', 'Once daily with food', 14,
  'Give with food to reduce risk of GI upset. Discontinue and call us if vomiting or black stools.',
  (NOW() - INTERVAL '15 days')::date::text,
  (NOW() - INTERVAL '1 day')::date::text,
  'completed', 0,
  NOW() - INTERVAL '15 days', NOW()
),
(
  gen_random_uuid(),
  'h8000001-0000-0000-0000-000000000001',
  'f6000001-0000-0000-0000-000000000003',
  'i9000001-0000-0000-0000-000000000001',
  'Otomax Otic Ointment',
  '4 drops per ear', 'Once daily at bedtime', 7,
  'Clean ears before application. Apply with gloved hands. Complete full course.',
  (NOW() - INTERVAL '90 days')::date::text,
  (NOW() - INTERVAL '83 days')::date::text,
  'completed', 0,
  NOW() - INTERVAL '90 days', NOW()
);

-- ── Appointments ──────────────────────────────────────────────

INSERT INTO tenant_happypaws.appointments (
  id, pet_id, vet_id, service_id, scheduled_at,
  duration_minutes, status, reason, notes,
  booked_by_id, created_at, updated_at
) VALUES
-- Completed past appointments
(
  gen_random_uuid(),
  'h8000001-0000-0000-0000-000000000001',
  'f6000001-0000-0000-0000-000000000003',
  'g7000001-0000-0000-0000-000000000001',
  NOW() - INTERVAL '90 days',
  30, 'completed',
  'Annual wellness exam',
  'Completed — see medical record.',
  'f6000001-0000-0000-0000-000000000007',
  NOW() - INTERVAL '95 days', NOW()
),
(
  gen_random_uuid(),
  'h8000001-0000-0000-0000-000000000007',
  'f6000001-0000-0000-0000-000000000002',
  'g7000001-0000-0000-0000-000000000001',
  NOW() - INTERVAL '35 days',
  30, 'completed',
  'Senior wellness exam — annual',
  'Completed — see medical record.',
  'f6000001-0000-0000-0000-000000000007',
  NOW() - INTERVAL '38 days', NOW()
),
(
  gen_random_uuid(),
  'h8000001-0000-0000-0000-000000000004',
  'f6000001-0000-0000-0000-000000000002',
  'g7000001-0000-0000-0000-000000000001',
  NOW() - INTERVAL '15 days',
  30, 'completed',
  'Hind limb lameness evaluation',
  'Completed — see medical record.',
  'f6000001-0000-0000-0000-000000000010',
  NOW() - INTERVAL '18 days', NOW()
),
-- Upcoming appointments
(
  'j0000001-0000-0000-0000-000000000001',
  'h8000001-0000-0000-0000-000000000003',
  'f6000001-0000-0000-0000-000000000003',
  'g7000001-0000-0000-0000-000000000001',
  NOW() + INTERVAL '2 days' + INTERVAL '10 hours',
  30, 'confirmed',
  'Annual wellness exam',
  NULL,
  'f6000001-0000-0000-0000-000000000011',
  NOW() - INTERVAL '5 days', NOW()
),
(
  'j0000001-0000-0000-0000-000000000002',
  'h8000001-0000-0000-0000-000000000008',
  'f6000001-0000-0000-0000-000000000003',
  'g7000001-0000-0000-0000-000000000008',
  NOW() + INTERVAL '3 days' + INTERVAL '14 hours',
  15, 'scheduled',
  'CKD recheck bloodwork',
  'Priority — follow up on hydration therapy and dietary change.',
  'f6000001-0000-0000-0000-000000000007',
  NOW() - INTERVAL '2 days', NOW()
),
(
  'j0000001-0000-0000-0000-000000000003',
  'h8000001-0000-0000-0000-000000000005',
  'f6000001-0000-0000-0000-000000000002',
  'g7000001-0000-0000-0000-000000000004',
  NOW() + INTERVAL '7 days' + INTERVAL '9 hours',
  90, 'scheduled',
  'Spay consultation and pre-surgical bloodwork',
  NULL,
  'f6000001-0000-0000-0000-000000000012',
  NOW() - INTERVAL '1 day', NOW()
),
(
  'j0000001-0000-0000-0000-000000000004',
  'h8000001-0000-0000-0000-000000000006',
  'f6000001-0000-0000-0000-000000000003',
  'g7000001-0000-0000-0000-000000000008',
  NOW() + INTERVAL '10 days' + INTERVAL '11 hours',
  15, 'scheduled',
  'Routine annual bloodwork — cardiac screening',
  'Maine Coon breed — HCM monitoring protocol.',
  'f6000001-0000-0000-0000-000000000013',
  NOW() - INTERVAL '3 days', NOW()
);

-- ── Audit log samples ─────────────────────────────────────────

INSERT INTO tenant_happypaws.audit_logs (
  id, actor_id, actor_email, app_context,
  action, resource_type, resource_id,
  metadata, ip_address, request_id, created_at
) VALUES
(
  gen_random_uuid(),
  'f6000001-0000-0000-0000-000000000006',
  'manager@happypaws.com',
  'crm',
  'POST /api/v1/staff',
  'user',
  'f6000001-0000-0000-0000-000000000005',
  '{"outcome":"SUCCESS","action":"staff_created"}',
  '192.168.1.101',
  gen_random_uuid()::text,
  NOW() - INTERVAL '55 days'
),
(
  gen_random_uuid(),
  'f6000001-0000-0000-0000-000000000003',
  'dr.chen@happypaws.com',
  'crm',
  'POST /api/v1/prescriptions',
  'prescription',
  NULL,
  '{"outcome":"SUCCESS","pet":"Buddy","medication":"Otomax"}',
  '192.168.1.102',
  gen_random_uuid()::text,
  NOW() - INTERVAL '90 days'
),
(
  gen_random_uuid(),
  'f6000001-0000-0000-0000-000000000001',
  'owner@happypaws.com',
  'crm',
  'PATCH /api/v1/settings',
  'settings',
  NULL,
  '{"outcome":"SUCCESS","changed":"onlineBooking"}',
  '192.168.1.100',
  gen_random_uuid()::text,
  NOW() - INTERVAL '14 days'
);

COMMIT;
