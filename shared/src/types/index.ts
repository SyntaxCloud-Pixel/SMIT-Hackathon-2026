export type UserRole = 'ADMIN' | 'HR' | 'EMPLOYEE';

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export interface Company {
  id: string;
  name: string;
  timezone: string;
  officeStartTime: string;
  gracePeriodMinutes: number;
  weekendDays: string[];
  officeAddress?: string;
  officeLatitude?: number | null;
  officeLongitude?: number | null;
  allowedAttendanceRadius: number;
  setupCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  isActive: boolean;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Designation {
  id: string;
  companyId: string;
  departmentId?: string | null;
  departmentName?: string | null;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeProfile {
  id: string;
  companyId: string;
  userId?: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  departmentId?: string | null;
  departmentName?: string | null;
  designationId?: string | null;
  designationName?: string | null;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  joiningDate: string;
  reportingManagerId?: string | null;
  reportingManagerName?: string | null;
  basicSalary?: number;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveType {
  id: string;
  companyId: string;
  name: string;
  annualQuota: number;
  isPaid: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Holiday {
  id: string;
  companyId: string;
  name: string;
  holidayDate: string;
  description?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  companyId: string;
  actorUserId?: string | null;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: any;
  afterData?: any;
  requestId?: string;
  createdAt: string;
}

export interface AuthSession {
  user: UserSummary;
  company: {
    id: string;
    name: string;
    timezone: string;
  };
  token: string;
}

export interface SetupStatusResponse {
  setupCompleted: boolean;
  company?: {
    id: string;
    name: string;
    timezone: string;
    officeStartTime: string;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CsvImportRowResult {
  rowNumber: number;
  employeeCode: string;
  fullName: string;
  email: string;
  isValid: boolean;
  errors: string[];
}

export interface CsvImportPreviewResponse {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: CsvImportRowResult[];
}

export interface CsvImportCommitResponse {
  importedCount: number;
  skippedCount: number;
  errors: { row: number; code: string; message: string }[];
  temporaryPasswords?: { email: string; employeeCode: string; temporaryPassword: string }[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  timestamp: string;
}

export interface HealthCheckData {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  version: string;
  environment: string;
  database: {
    configured: boolean;
    status: 'connected' | 'disconnected' | 'unconfigured';
  };
}

// -------------------------------------------------------------
// PHASE 4 ATTENDANCE TYPES
// -------------------------------------------------------------
export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKEND';

export interface AttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  departmentName?: string;
  attendanceDate: string; // YYYY-MM-DD
  checkIn?: string | null;
  checkOut?: string | null;
  status: AttendanceStatus;
  isLate: boolean;
  minutesLate: number;
  workedMinutes: number;
  notes?: string;
  isCorrected: boolean;
  correctionReason?: string;
  correctedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSummary {
  totalEmployees: number;
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  absentCount: number;
  onLeaveCount: number;
  missingCheckoutsCount: number;
}

export interface AttendanceTodayResponse {
  record: AttendanceRecord | null;
  serverTime: string;
  companyTimezone: string;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

export interface AttendanceMonthlyReport {
  month: number;
  year: number;
  totalWorkingDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  records: AttendanceRecord[];
}

// -------------------------------------------------------------
// PHASE 5 LEAVE MANAGEMENT TYPES
// -------------------------------------------------------------
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  companyId: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  departmentName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  workingDays: number;
  reason: string;
  status: LeaveRequestStatus;
  reviewerUserId?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  reviewerComments?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalanceSummary {
  leaveTypeId: string;
  leaveTypeName: string;
  annualQuota: number;
  isPaid: boolean;
  usedDays: number;
  remainingDays: number;
}

export interface WorkingDaysEstimateResponse {
  workingDays: number;
  totalCalendarDays: number;
  weekendDaysCount: number;
  holidayDaysCount: number;
  holidaysEncountered: string[];
}

// -------------------------------------------------------------
// PHASE 6 PAYROLL & PAYSLIP TYPES
// -------------------------------------------------------------
export type PayrollStatus = 'DRAFT' | 'FINALIZED';

export interface PayrollRun {
  id: string;
  companyId: string;
  month: number;
  year: number;
  status: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  finalizedBy?: string | null;
  finalizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  companyId: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  departmentName?: string;
  designationName?: string;
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  grossSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  absentDeduction: number;
  unpaidLeaveDeduction: number;
  taxWithholding: number;
  netSalary: number;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRunDetail extends PayrollRun {
  items: PayrollItem[];
}

// -------------------------------------------------------------
// PHASE 7 ANNOUNCEMENTS, NOTIFICATIONS, ANALYTICS & AI
// -------------------------------------------------------------
export interface Announcement {
  id: string;
  companyId: string;
  title: string;
  content: string;
  isPinned: boolean;
  authorUserId: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  message: string;
  type: 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'ANNOUNCEMENT' | 'SYSTEM';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  lateToday: number;
  pendingLeaves: number;
  lastPayrollTotal: number;
  departmentHeadcounts: { departmentName: string; count: number }[];
  attendanceRate: number;
}

export interface AttendanceAnalyticsTrend {
  date: string;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface AIChatRequest {
  message: string;
  history?: AIChatMessage[];
}

export interface AIChatResponse {
  response: string;
  suggestedPrompts?: string[];
}

