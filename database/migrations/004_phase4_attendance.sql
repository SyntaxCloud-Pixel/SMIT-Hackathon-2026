-- HCM Lite: Versioned SQL Migration 004
-- Description: Phase 4 Attendance Management Schema

CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    minutes_late INT NOT NULL DEFAULT 0,
    worked_minutes INT NOT NULL DEFAULT 0,
    notes TEXT,
    is_corrected BOOLEAN NOT NULL DEFAULT FALSE,
    correction_reason TEXT,
    corrected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_employee_daily_attendance UNIQUE (company_id, employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendances_company_date ON attendances(company_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendances_emp_date ON attendances(company_id, employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON attendances(company_id, status);
CREATE INDEX IF NOT EXISTS idx_attendances_late ON attendances(company_id, is_late);
