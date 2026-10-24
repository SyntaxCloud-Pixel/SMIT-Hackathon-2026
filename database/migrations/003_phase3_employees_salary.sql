-- HCM Lite: Versioned SQL Migration 003
-- Description: Add basic_salary to employees and indices for search and filtering

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- Additional composite and performance indexes for directory search and filtering
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(company_id, employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(company_id, department_id);
CREATE INDEX IF NOT EXISTS idx_employees_desig ON employees(company_id, designation_id);
