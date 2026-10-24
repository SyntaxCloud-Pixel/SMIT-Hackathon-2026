# HCM Lite — AI-Assisted Human Capital Management System
### Saylani Hackathon Project 2026

HCM Lite is a modern, enterprise-grade Human Capital Management (HCM) web platform built with a full-stack TypeScript architecture. It features complete role-based operations for **Admin**, **HR**, and **Employees**, automated attendance tracking with geolocation validation, leave request lifecycle with statutory balances, automated payroll calculations with Pakistani income tax slabs, visual analytics, in-app notifications, company announcements, and an AI assistant grounded in real company data.

---

## Complete Feature Matrix

| Module | Features & Capabilities | Access Level |
|---|---|---|
| **First-Run Setup & Auth** | Onboarding wizard, signed JWT sessions, bcrypt hashing, role enforcement, active account verification | Admin / Public |
| **Organization Management** | Departments, Job Designations, Statutory Leave Policies, Public Holiday Calendar | Admin, HR |
| **Employee Directory** | Staff profiles, code generation, direct reports, salary structure, CSV bulk import with dry-run preview | Admin, HR, Employee (self) |
| **Attendance Tracking** | Live punch terminal, geolocation radius verification, office hours & grace period calculation, late detection, admin correction dialog, monthly attendance calendar, CSV export | All Roles (Scoped) |
| **Leave Management** | Quotas tracking (Annual, Sick, Casual, Unpaid), working days calculation excluding weekends & public holidays, overlap collision detection, approval workflow (Approve/Reject with comments) | All Roles (Scoped) |
| **Payroll & Payslips** | Basic salary, HRA (40%), Medical (10%), Gross (150%), absent deductions, Pakistani progressive tax brackets, draft preview, immutable finalization, downloadable pay stubs, CSV export | Admin, HR, Employee (self) |
| **Workforce Analytics** | Real-time aggregate KPIs, daily attendance trends (7/14/30 days) using Recharts, department headcount breakdown | Admin, HR |
| **Announcements** | Organization bulletin board, pinned priority announcements, author attribution, date tracking | All Roles |
| **Notifications** | Live notification bell with unread counters, auto-triggered on leave decisions and payroll releases | All Roles |
| **AI HR Assistant** | Context-aware AI helpdesk answering questions regarding leave balances, headcount, office hours, and payroll summaries with tool calling and grounded company records | All Roles |
| **System Audit Logs** | Comprehensive immutable audit trail logging actors, entities, timestamps, and before/after state diffs | Admin |

---

## Monorepo Architecture

```text
HCM Lite Monorepo
├── backend/                  # Node.js + Express + TypeScript REST API
│   ├── src/
│   │   ├── config/           # Database pool, environment variables
│   │   ├── controllers/      # Setup, Auth, Org, Employees, Attendance, Leaves, Payroll, Announcements, Notifications, Dashboard, AI
│   │   ├── middleware/       # requireAuth, requireRole, requireActiveAccount, errorHandler
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # Store service (PostgreSQL + In-memory fallback), Audit service, AI service
│   │   ├── tests/            # Automated test suites for all phases (Phase 2 to Phase 7)
│   │   └── utils/            # Attendance evaluator, Leave working days calculator, Payroll tax engine, Logger
├── frontend/                 # React 18 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/       # shadcn/ui inspired design system (Card, Button, Badge, Dialog, Table, States)
│   │   │   └── layout/       # Collapsible Sidebar, TopNav, MobileNav, Breadcrumbs, UserMenu, NotificationDropdown
│   │   ├── context/          # Authentication & Workspace Context
│   │   ├── pages/            # 16 complete functional views (Overview, Org, Staff, Attendance, Leaves, Payroll, Analytics, AI, etc.)
│   │   └── services/         # Type-safe API client
├── database/                 # Supabase PostgreSQL
│   └── migrations/           # 001 to 007 version-controlled SQL migrations
└── shared/                   # Shared types, interfaces, and Zod validation schemas
```

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router 6, React Hook Form, Zod, Recharts
- **Backend**: Node.js, Express, TypeScript, Zod, JWT (`jsonwebtoken`), `bcryptjs`, `pg` (PostgreSQL client pool)
- **Database**: Supabase PostgreSQL with versioned SQL migrations
- **Design System**: Enterprise dark navy sidebar (`#0f172a`), clean slate workspace (`#f8fafc`), brand indigo accents (`#4f46e5`), accessible responsive shell

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)

### 2. Installation
Install dependencies across all workspaces:
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Compiling the Monorepo
Build shared types, backend, and frontend:
```bash
npm run build
```

### 5. Running in Development Mode
Run both backend and frontend concurrently:
```bash
npm run dev
```
Or run individually:
- **Backend API**: `npm run dev:backend` (Runs on `http://localhost:5000`)
- **Frontend App**: `npm run dev:frontend` (Runs on `http://localhost:5173`)

---

## Automated Test Suites

The codebase includes exhaustive automated test suites covering all phases with 100% verification:

```bash
# Run Phase 2: Setup, Authentication & RBAC Tests
npm --workspace=backend run test

# Run Phase 3: Organization & Employee Management Tests
npm --workspace=backend run test:phase3

# Run Phase 4: Attendance Tracking & Geolocation Tests
npm --workspace=backend run test:phase4

# Run Phase 5: Leave Management & Quota Balance Tests
npm --workspace=backend run test:phase5

# Run Phase 6: Payroll Calculation, Tax Slabs & Payslips Tests
npm --workspace=backend run test:phase6

# Run Phase 7: Dashboards, Analytics, Announcements & AI Assistant Tests
npm --workspace=backend run test:phase7
```

---

## Statutory Calculations & Formulas

### Gross Pay & Allowances
- **Basic Salary**: Configured on employee profile
- **House Rent Allowance (HRA)**: 40% of Basic Pay
- **Medical Allowance**: 10% of Basic Pay
- **Gross Earnings**: 150% of Basic Pay (`Basic + HRA + Medical`)

### Working Days & Deductions
- **Standard Working Days Divisor**: 26 days
- **Daily Rate**: `Gross Salary / 26`
- **Absent Deduction**: `Daily Rate × Absent Days`
- **Unpaid Leave Deduction**: `Daily Rate × Unpaid Leave Days`

### Pakistani Progressive Income Tax Slabs
- **Up to PKR 600,000 / year**: 0%
- **PKR 600,001 to 1,200,000 / year**: 5% of amount exceeding 600,000
- **PKR 1,200,001 to 2,400,000 / year**: PKR 30,000 + 15% of amount exceeding 1,200,000
- **PKR 2,400,001 to 3,600,000 / year**: PKR 210,000 + 25% of amount exceeding 2,400,000
- **Above PKR 3,600,000 / year**: PKR 510,000 + 35% of amount exceeding 3,600,000
- **Monthly Tax Withholding**: `Annual Tax / 12`
