# HCM Lite — Database Architecture & Migrations

This directory contains versioned SQL migrations for Supabase PostgreSQL.

## Directory Structure
```
database/
├── migrations/
│   ├── 001_initial_schema.sql      # Foundational schema (Types, basic users, logs)
│   └── 002_phase2_core_schema.sql  # Core enterprise schema (Companies, Users, Departments, Designations, Employees, Leave Types, Holidays, Audit Logs)
└── README.md
```

## Schema Overview (Phase 2)

### 1. `companies`
- Holds tenant profile, operating parameters, and attendance rules:
  - `id`: UUID (Primary Key)
  - `name`: Organization name
  - `timezone`: Standard IANA timezone (default `UTC`)
  - `office_start_time`: Opening hour (default `09:00:00`)
  - `grace_period_minutes`: Grace window before late flag (default `15`)
  - `weekend_days`: JSONB array of weekend days (default `["Saturday", "Sunday"]`)
  - `office_address`: Physical address
  - `office_latitude` & `office_longitude`: Coordinates for geofencing
  - `allowed_attendance_radius`: Geofencing threshold in meters (default `200`)
  - `setup_completed`: Boolean flag preventing duplicate public initialization

### 2. `users`
- System identities with role enforcement:
  - `id`: UUID (Primary Key)
  - `company_id`: References `companies(id)` (Cascading delete)
  - `email`: Unique normalized work email
  - `password_hash`: Bcrypt salted cryptographic hash
  - `full_name`: Identity display name
  - `role`: PostgreSQL ENUM (`ADMIN`, `HR`, `EMPLOYEE`)
  - `is_active`: Boolean status flag (revokes session immediately when false)
  - `must_change_password`: First-login password rotation flag

### 3. `departments` & `designations`
- Company-scoped workforce hierarchy with uniqueness constraints per company.

### 4. `employees`
- Employee profile records linked to user identities with `employee_code` uniqueness per company.

### 5. `leave_types`
- Company-scoped statutory and custom leave policies:
  - `Annual Leave`: 14 Days (Paid)
  - `Sick Leave`: 8 Days (Paid)
  - `Casual Leave`: 10 Days (Paid)
  - `Unpaid Leave`: Unlimited (Unpaid)

### 6. `holidays`
- Company-scoped statutory holiday calendar.

### 7. `audit_logs`
- Append-only security and operational audit trail tracking `action`, `actor_user_id`, `entity_type`, `entity_id`, state diffs, and timestamps. Sensitive keys (passwords, tokens) are automatically redacted.

---

## Applying Migrations

### Option 1: Supabase Dashboard SQL Editor
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and navigate to the **SQL Editor**.
3. Run `001_initial_schema.sql`, then run `002_phase2_core_schema.sql`.

### Option 2: Supabase CLI
```bash
npx supabase db push
```

### Option 3: Direct PostgreSQL Connection via psql
```bash
psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f database/migrations/002_phase2_core_schema.sql
```
