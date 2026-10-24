-- HCM Lite: Versioned SQL Migration 006
-- Description: Phase 6 Payroll and Payslips Schema

CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'FINALIZED'
    total_gross NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_net NUMERIC(14, 2) NOT NULL DEFAULT 0,
    employee_count INTEGER NOT NULL DEFAULT 0,
    finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payroll_runs_company_month_year UNIQUE(company_id, month, year)
);

CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    basic_salary NUMERIC(12, 2) NOT NULL,
    hra NUMERIC(12, 2) NOT NULL,
    medical_allowance NUMERIC(12, 2) NOT NULL,
    gross_salary NUMERIC(12, 2) NOT NULL,
    working_days INTEGER NOT NULL DEFAULT 26,
    present_days NUMERIC(4, 1) NOT NULL DEFAULT 0,
    absent_days NUMERIC(4, 1) NOT NULL DEFAULT 0,
    unpaid_leave_days NUMERIC(4, 1) NOT NULL DEFAULT 0,
    absent_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unpaid_leave_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_withholding NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payroll_items_run_employee UNIQUE(payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON payroll_items(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
