import { z } from 'zod';

export const UserRoleSchema = z.enum(['ADMIN', 'HR', 'EMPLOYEE']);
export const EmploymentStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']);
export const EmploymentTypeSchema = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']);

export const LoginRequestSchema = z.object({
  email: z.string().trim().email({ message: 'A valid work email is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const CompanySetupRequestSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(2, { message: 'Company name must be at least 2 characters' })
      .max(100, { message: 'Company name must not exceed 100 characters' }),
    timezone: z.string().default('UTC'),
    officeStartTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Office start time must be in HH:MM 24-hour format',
      })
      .default('09:00'),
    gracePeriodMinutes: z
      .number()
      .int()
      .min(0, { message: 'Grace period cannot be negative' })
      .max(120, { message: 'Grace period cannot exceed 120 minutes' })
      .default(15),
    weekendDays: z
      .array(z.string())
      .min(1, { message: 'At least one weekend day must be specified' })
      .default(['Saturday', 'Sunday']),
    officeAddress: z.string().optional().default(''),
    officeLatitude: z.number().nullable().optional(),
    officeLongitude: z.number().nullable().optional(),
    allowedAttendanceRadius: z
      .number()
      .int()
      .min(10, { message: 'Radius must be at least 10 meters' })
      .max(50000, { message: 'Radius cannot exceed 50,000 meters' })
      .default(200),

    adminFullName: z
      .string()
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters' }),
    adminEmail: z
      .string()
      .trim()
      .email({ message: 'A valid email address is required for the admin' }),
    adminPassword: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' }),
    confirmPassword: z
      .string()
      .min(8, { message: 'Please confirm your password' }),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type CompanySetupRequest = z.infer<typeof CompanySetupRequestSchema>;

// Department Schemas
export const DepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Department name must be at least 2 characters' })
    .max(100, { message: 'Department name cannot exceed 100 characters' }),
  description: z.string().trim().max(500).optional().default(''),
});

export type DepartmentInput = z.infer<typeof DepartmentSchema>;

// Designation Schemas
export const DesignationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Designation name must be at least 2 characters' })
    .max(100, { message: 'Designation name cannot exceed 100 characters' }),
  departmentId: z.string().nullable().optional(),
  description: z.string().trim().max(500).optional().default(''),
});

export type DesignationInput = z.infer<typeof DesignationSchema>;

// Leave Type Update Schema
export const LeaveTypeUpdateSchema = z.object({
  annualQuota: z
    .number()
    .min(0, { message: 'Annual quota must be non-negative' })
    .max(365, { message: 'Annual quota cannot exceed 365 days' }),
  isPaid: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export type LeaveTypeUpdateInput = z.infer<typeof LeaveTypeUpdateSchema>;

// Holiday Schemas
export const HolidaySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Holiday name must be at least 2 characters' })
    .max(100, { message: 'Holiday name cannot exceed 100 characters' }),
  holidayDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be formatted as YYYY-MM-DD' }),
  description: z.string().trim().max(500).optional().default(''),
});

export type HolidayInput = z.infer<typeof HolidaySchema>;

// Employee Registration Schema
export const EmployeeRegisterSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Full name must be at least 2 characters' })
    .max(150, { message: 'Full name cannot exceed 150 characters' }),
  email: z
    .string()
    .trim()
    .email({ message: 'A valid email address is required' })
    .max(255),
  phone: z.string().trim().max(50).optional().default(''),
  address: z.string().trim().max(500).optional().default(''),
  departmentId: z.string().min(1, { message: 'Please select an active department' }),
  designationId: z.string().min(1, { message: 'Please select an active designation' }),
  employeeCode: z
    .string()
    .trim()
    .min(2, { message: 'Employee ID/Code must be at least 2 characters' })
    .max(50, { message: 'Employee code cannot exceed 50 characters' }),
  employmentType: EmploymentTypeSchema.default('FULL_TIME'),
  joiningDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Joining date must be formatted as YYYY-MM-DD' }),
  reportingManagerId: z.string().nullable().optional(),
  basicSalary: z
    .number()
    .min(0, { message: 'Basic salary must be non-negative' })
    .default(0),
});

export type EmployeeRegisterInput = z.infer<typeof EmployeeRegisterSchema>;

// Employee Update Schema
export const EmployeeUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(50).optional().default(''),
  address: z.string().trim().max(500).optional().default(''),
  departmentId: z.string().min(1),
  designationId: z.string().min(1),
  employmentType: EmploymentTypeSchema,
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reportingManagerId: z.string().nullable().optional(),
  basicSalary: z.number().min(0).optional(),
});

export type EmployeeUpdateInput = z.infer<typeof EmployeeUpdateSchema>;

// Employee Status Update Schema
export const EmployeeStatusUpdateSchema = z.object({
  employmentStatus: EmploymentStatusSchema,
  isActive: z.boolean(),
});

export type EmployeeStatusUpdateInput = z.infer<typeof EmployeeStatusUpdateSchema>;

export const UpdateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

// -------------------------------------------------------------
// PHASE 4 ATTENDANCE SCHEMAS
// -------------------------------------------------------------
export const AttendanceStatusSchema = z.enum([
  'PRESENT',
  'LATE',
  'HALF_DAY',
  'ABSENT',
  'ON_LEAVE',
  'HOLIDAY',
  'WEEKEND',
]);

export const AttendanceCheckInSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export const AttendanceCheckOutSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export const AttendanceCorrectionSchema = z.object({
  status: AttendanceStatusSchema.optional(),
  checkIn: z.string().nullable().optional(),
  checkOut: z.string().nullable().optional(),
  correctionReason: z
    .string()
    .trim()
    .min(5, { message: 'A detailed correction reason (min 5 characters) is required' })
    .max(500),
});

export type AttendanceCorrectionInput = z.infer<typeof AttendanceCorrectionSchema>;

export const AttendanceFilterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  departmentId: z.string().optional(),
  status: AttendanceStatusSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// -------------------------------------------------------------
// PHASE 5 LEAVE MANAGEMENT SCHEMAS
// -------------------------------------------------------------
export const LeaveStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

export const LeaveRequestSubmitSchema = z
  .object({
    leaveTypeId: z.string().min(1, { message: 'Leave type is required' }),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Start date must be formatted as YYYY-MM-DD' }),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'End date must be formatted as YYYY-MM-DD' }),
    reason: z
      .string()
      .trim()
      .min(3, { message: 'Please provide a reason for the leave request (min 3 chars)' })
      .max(500),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  });

export type LeaveRequestSubmitInput = z.infer<typeof LeaveRequestSubmitSchema>;

export const LeaveRequestReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    message: 'Review decision must be either APPROVED or REJECTED',
  }),
  comments: z.string().trim().max(500).optional(),
});

export type LeaveRequestReviewInput = z.infer<typeof LeaveRequestReviewSchema>;

export const LeaveWorkingDaysEstimateSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  });

export const LeaveRequestFilterSchema = z.object({
  status: LeaveStatusSchema.optional(),
  departmentId: z.string().optional(),
  leaveTypeId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// -------------------------------------------------------------
// PHASE 6 PAYROLL SCHEMAS
// -------------------------------------------------------------
export const PayrollStatusSchema = z.enum(['DRAFT', 'FINALIZED']);

export const GeneratePayrollDraftSchema = z.object({
  month: z.coerce.number().int().min(1, 'Month must be between 1 and 12').max(12, 'Month must be between 1 and 12'),
  year: z.coerce.number().int().min(2000, 'Year must be 2000 or later').max(2100, 'Year must not exceed 2100'),
});

export type GeneratePayrollDraftInput = z.infer<typeof GeneratePayrollDraftSchema>;

export const FinalizePayrollSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type FinalizePayrollInput = z.infer<typeof FinalizePayrollSchema>;

// -------------------------------------------------------------
// PHASE 7 ANNOUNCEMENT, NOTIFICATION & AI SCHEMAS
// -------------------------------------------------------------
export const AnnouncementCreateSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  content: z.string().trim().min(5, 'Content must be at least 5 characters').max(5000),
  isPinned: z.boolean().default(false),
});

export type AnnouncementCreateInput = z.infer<typeof AnnouncementCreateSchema>;

export const AIChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
});

export type AIChatRequestInput = z.infer<typeof AIChatRequestSchema>;

