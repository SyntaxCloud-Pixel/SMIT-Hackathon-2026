import {
  ApiResponse,
  HealthCheckData,
  AuthSession,
  LoginRequest,
  CompanySetupRequest,
  SetupStatusResponse,
  AuditLogEntry,
  UserSummary,
  Department,
  Designation,
  Holiday,
  LeaveType,
  EmployeeProfile,
  PaginatedResult,
  DepartmentInput,
  DesignationInput,
  HolidayInput,
  LeaveTypeUpdateInput,
  EmployeeRegisterInput,
  EmployeeUpdateInput,
  EmployeeStatusUpdateInput,
  CsvImportPreviewResponse,
  CsvImportCommitResponse,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceTodayResponse,
  AttendanceCorrectionInput,
  AttendanceMonthlyReport,
  LeaveRequest,
  LeaveBalanceSummary,
  WorkingDaysEstimateResponse,
  LeaveRequestSubmitInput,
  LeaveRequestReviewInput,
  PayrollRun,
  PayrollItem,
  PayrollRunDetail,
  Announcement,
  AnnouncementCreateInput,
  AppNotification,
  DashboardSummary,
  AttendanceAnalyticsTrend,
  AIChatResponse,
} from "@hcm-lite/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = localStorage.getItem("hcm_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });
    } catch (networkError: any) {
      throw new Error("Unable to connect to the HCM Lite backend. Please ensure the API server is running.");
    }

    let json: ApiResponse<T>;
    try {
      json = (await response.json()) as ApiResponse<T>;
    } catch (parseError) {
      throw new Error(`Server returned unexpected response (HTTP ${response.status})`);
    }

    if (!response.ok) {
      const errObj = new Error(json.message || `Request failed with status ${response.status}`) as any;
      errObj.code = json.error?.code;
      errObj.status = response.status;
      errObj.details = json.error?.details;
      throw errObj;
    }

    return json;
  }

  // System & Health
  async getHealth(): Promise<HealthCheckData> {
    const res = await this.request<HealthCheckData>("/health");
    return res.data!;
  }

  async getSetupStatus(): Promise<SetupStatusResponse> {
    const res = await this.request<SetupStatusResponse>("/setup/status");
    return res.data!;
  }

  async initializeSetup(data: CompanySetupRequest): Promise<AuthSession> {
    const res = await this.request<AuthSession>("/setup/initialize", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  // Auth
  async login(credentials: LoginRequest): Promise<AuthSession> {
    const res = await this.request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    return res.data!;
  }

  async getMe(): Promise<{ user: UserSummary; company: any }> {
    const res = await this.request<{ user: UserSummary; company: any }>("/auth/me");
    return res.data!;
  }

  async logout(): Promise<void> {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } catch (err) {
      // Ignore
    }
  }

  // Organization & Users
  async getCompanyUsers(): Promise<UserSummary[]> {
    const res = await this.request<UserSummary[]>("/organization/users");
    return res.data || [];
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<UserSummary> {
    const res = await this.request<UserSummary>(`/organization/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    return res.data!;
  }

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await this.request<AuditLogEntry[]>("/organization/audit-logs");
    return res.data || [];
  }

  // Departments
  async getDepartments(params?: { search?: string; isActive?: boolean; page?: number; pageSize?: number }): Promise<PaginatedResult<Department>> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.isActive !== undefined) query.append("isActive", String(params.isActive));
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));

    const res = await this.request<PaginatedResult<Department>>(`/departments?${query.toString()}`);
    return res.data!;
  }

  async createDepartment(data: DepartmentInput): Promise<Department> {
    const res = await this.request<Department>("/departments", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  async updateDepartment(id: string, data: DepartmentInput): Promise<Department> {
    const res = await this.request<Department>(`/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  async deactivateDepartment(id: string, isActive: boolean): Promise<Department> {
    const res = await this.request<Department>(`/departments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    return res.data!;
  }

  // Designations
  async getDesignations(params?: { departmentId?: string; search?: string; isActive?: boolean; page?: number; pageSize?: number }): Promise<PaginatedResult<Designation>> {
    const query = new URLSearchParams();
    if (params?.departmentId) query.append("departmentId", params.departmentId);
    if (params?.search) query.append("search", params.search);
    if (params?.isActive !== undefined) query.append("isActive", String(params.isActive));
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));

    const res = await this.request<PaginatedResult<Designation>>(`/designations?${query.toString()}`);
    return res.data!;
  }

  async createDesignation(data: DesignationInput): Promise<Designation> {
    const res = await this.request<Designation>("/designations", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  async updateDesignation(id: string, data: DesignationInput): Promise<Designation> {
    const res = await this.request<Designation>(`/designations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  async deactivateDesignation(id: string, isActive: boolean): Promise<Designation> {
    const res = await this.request<Designation>(`/designations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    return res.data!;
  }

  // Leave Types
  async getLeaveTypes(): Promise<LeaveType[]> {
    const res = await this.request<LeaveType[]>("/organization/leave-types");
    return res.data || [];
  }

  async updateLeaveType(id: string, data: LeaveTypeUpdateInput): Promise<LeaveType> {
    const res = await this.request<LeaveType>(`/organization/leave-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  // Holidays
  async getHolidays(params?: { year?: number; search?: string; page?: number; pageSize?: number }): Promise<PaginatedResult<Holiday>> {
    const query = new URLSearchParams();
    if (params?.year) query.append("year", String(params.year));
    if (params?.search) query.append("search", params.search);
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));

    const res = await this.request<PaginatedResult<Holiday>>(`/holidays?${query.toString()}`);
    return res.data!;
  }

  async createHoliday(data: HolidayInput): Promise<Holiday> {
    const res = await this.request<Holiday>("/holidays", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  async updateHoliday(id: string, data: HolidayInput): Promise<Holiday> {
    const res = await this.request<Holiday>(`/holidays/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  async deleteHoliday(id: string): Promise<void> {
    await this.request(`/holidays/${id}`, {
      method: "DELETE",
    });
  }

  // Employees
  async getEmployees(params?: {
    search?: string;
    departmentId?: string;
    designationId?: string;
    employmentStatus?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }): Promise<PaginatedResult<EmployeeProfile>> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.departmentId) query.append("departmentId", params.departmentId);
    if (params?.designationId) query.append("designationId", params.designationId);
    if (params?.employmentStatus) query.append("employmentStatus", params.employmentStatus);
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.sortBy) query.append("sortBy", params.sortBy);
    if (params?.sortOrder) query.append("sortOrder", params.sortOrder);

    const res = await this.request<PaginatedResult<EmployeeProfile>>(`/employees?${query.toString()}`);
    return res.data!;
  }

  async getEmployee(id: string): Promise<EmployeeProfile> {
    const res = await this.request<EmployeeProfile>(`/employees/${id}`);
    return res.data!;
  }

  async registerEmployee(data: EmployeeRegisterInput): Promise<{ employee: EmployeeProfile; temporaryPassword?: string }> {
    const res = await this.request<{ employee: EmployeeProfile; temporaryPassword?: string }>("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  async updateEmployee(id: string, data: EmployeeUpdateInput): Promise<EmployeeProfile> {
    const res = await this.request<EmployeeProfile>(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  async updateEmployeeStatus(id: string, data: EmployeeStatusUpdateInput): Promise<EmployeeProfile> {
    const res = await this.request<EmployeeProfile>(`/employees/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return res.data!;
  }

  async previewCsvImport(rows: any[]): Promise<CsvImportPreviewResponse> {
    const res = await this.request<CsvImportPreviewResponse>("/employees/import/preview", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
    return res.data!;
  }

  async commitCsvImport(rows: any[]): Promise<CsvImportCommitResponse> {
    const res = await this.request<CsvImportCommitResponse>("/employees/import/commit", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
    return res.data!;
  }

  async downloadEmployeesCsv(params?: { search?: string; departmentId?: string; designationId?: string; employmentStatus?: string }): Promise<void> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.departmentId) query.append("departmentId", params.departmentId);
    if (params?.designationId) query.append("designationId", params.designationId);
    if (params?.employmentStatus) query.append("employmentStatus", params.employmentStatus);

    const token = localStorage.getItem("hcm_auth_token");
    const response = await fetch(`${API_BASE_URL}/employees/export/csv?${query.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download CSV export");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hcm_employees_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // -------------------------------------------------------------
  // ATTENDANCE MANAGEMENT (PHASE 4)
  // -------------------------------------------------------------
  async getTodayAttendance(): Promise<AttendanceTodayResponse> {
    const res = await this.request<AttendanceTodayResponse>("/attendance/today");
    return res.data!;
  }

  async checkIn(notes?: string): Promise<AttendanceRecord> {
    const res = await this.request<AttendanceRecord>("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
    return res.data!;
  }

  async checkOut(notes?: string): Promise<AttendanceRecord> {
    const res = await this.request<AttendanceRecord>("/attendance/check-out", {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
    return res.data!;
  }

  async getMyAttendanceHistory(params?: {
    month?: number;
    year?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ records: AttendanceRecord[]; total: number; summary: AttendanceMonthlyReport }> {
    const query = new URLSearchParams();
    if (params?.month) query.append("month", String(params.month));
    if (params?.year) query.append("year", String(params.year));
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));

    const res = await this.request<{
      records: AttendanceRecord[];
      total: number;
      summary: AttendanceMonthlyReport;
    }>(`/attendance/my-history?${query.toString()}`);
    return res.data!;
  }

  async getCompanyAttendance(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<AttendanceRecord>> {
    const query = new URLSearchParams();
    if (params?.date) query.append("date", params.date);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    if (params?.departmentId) query.append("departmentId", params.departmentId);
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));

    const res = await this.request<PaginatedResult<AttendanceRecord>>(
      `/attendance/company?${query.toString()}`
    );
    return res.data!;
  }

  async getAttendanceSummary(date?: string): Promise<AttendanceSummary> {
    const query = new URLSearchParams();
    if (date) query.append("date", date);
    const res = await this.request<AttendanceSummary>(`/attendance/summary?${query.toString()}`);
    return res.data!;
  }

  async correctAttendance(id: string, input: AttendanceCorrectionInput): Promise<AttendanceRecord> {
    const res = await this.request<AttendanceRecord>(`/attendance/${id}/correct`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return res.data!;
  }

  async downloadAttendanceCsv(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    status?: string;
    search?: string;
  }): Promise<void> {
    const query = new URLSearchParams();
    if (params?.date) query.append("date", params.date);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    if (params?.departmentId) query.append("departmentId", params.departmentId);
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);

    const token = localStorage.getItem("hcm_auth_token");
    const response = await fetch(`${API_BASE_URL}/attendance/export/csv?${query.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download attendance CSV export");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // -------------------------------------------------------------
  // LEAVE MANAGEMENT (PHASE 5)
  // -------------------------------------------------------------
  async getLeaveBalances(employeeId?: string, year?: number): Promise<LeaveBalanceSummary[]> {
    const query = new URLSearchParams();
    if (employeeId) query.append("employeeId", employeeId);
    if (year) query.append("year", String(year));

    const res = await this.request<LeaveBalanceSummary[]>(`/leaves/balances?${query.toString()}`);
    return res.data!;
  }

  async estimateLeaveWorkingDays(startDate: string, endDate: string): Promise<WorkingDaysEstimateResponse> {
    const res = await this.request<WorkingDaysEstimateResponse>("/leaves/estimate", {
      method: "POST",
      body: JSON.stringify({ startDate, endDate }),
    });
    return res.data!;
  }

  async submitLeaveRequest(input: LeaveRequestSubmitInput): Promise<LeaveRequest> {
    const res = await this.request<LeaveRequest>("/leaves/requests", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return res.data!;
  }

  async getMyLeaveRequests(): Promise<LeaveRequest[]> {
    const res = await this.request<LeaveRequest[]>("/leaves/my-requests");
    return res.data!;
  }

  async cancelLeaveRequest(requestId: string): Promise<LeaveRequest> {
    const res = await this.request<LeaveRequest>(`/leaves/requests/${requestId}/cancel`, {
      method: "PATCH",
    });
    return res.data!;
  }

  async getCompanyLeaveRequests(params?: {
    status?: string;
    departmentId?: string;
    leaveTypeId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<LeaveRequest>> {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.departmentId) query.append("departmentId", params.departmentId);
    if (params?.leaveTypeId) query.append("leaveTypeId", params.leaveTypeId);
    if (params?.search) query.append("search", params.search);
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));

    const res = await this.request<PaginatedResult<LeaveRequest>>(`/leaves/company?${query.toString()}`);
    return res.data!;
  }

  async reviewLeaveRequest(requestId: string, input: LeaveRequestReviewInput): Promise<LeaveRequest> {
    const res = await this.request<LeaveRequest>(`/leaves/requests/${requestId}/review`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return res.data!;
  }

  // -------------------------------------------------------------
  // PHASE 6 PAYROLL API
  // -------------------------------------------------------------
  async generatePayrollDraft(month: number, year: number): Promise<PayrollRunDetail> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/payroll/draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ month, year }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to generate payroll draft");
    }
    return res.json();
  }

  async getPayrollRuns(): Promise<PayrollRun[]> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/payroll/runs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load payroll runs");
    return res.json();
  }

  async getPayrollRunDetail(runId: string): Promise<PayrollRunDetail> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/payroll/runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load payroll run details");
    return res.json();
  }

  async finalizePayrollRun(runId: string): Promise<PayrollRunDetail> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/payroll/runs/${runId}/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to finalize payroll run");
    }
    return res.json();
  }

  getPayrollExportCsvUrl(runId: string): string {
    return `${API_BASE_URL}/payroll/runs/${runId}/export`;
  }

  async getMyPayslips(): Promise<PayrollItem[]> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/payroll/my-payslips`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load employee payslips");
    return res.json();
  }

  async getMyPayslipById(itemId: string): Promise<PayrollItem> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/payroll/my-payslips/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load payslip detail");
    return res.json();
  }

  // -------------------------------------------------------------
  // PHASE 7 ANNOUNCEMENTS & NOTIFICATIONS API
  // -------------------------------------------------------------
  async getAnnouncements(): Promise<Announcement[]> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/announcements`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load announcements");
    return res.json();
  }

  async createAnnouncement(data: AnnouncementCreateInput): Promise<Announcement> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/announcements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to publish announcement");
    }
    return res.json();
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/announcements/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete announcement");
  }

  async getNotifications(): Promise<AppNotification[]> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load notifications");
    return res.json();
  }

  async markNotificationRead(id: string): Promise<void> {
    const token = localStorage.getItem("hcm_auth_token");
    await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // -------------------------------------------------------------
  // PHASE 7 DASHBOARD & AI API
  // -------------------------------------------------------------
  async getDashboardSummary(): Promise<DashboardSummary> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load dashboard summary");
    return res.json();
  }

  async getAttendanceTrends(days = 7): Promise<AttendanceAnalyticsTrend[]> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/dashboard/attendance-trends?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load attendance trends");
    return res.json();
  }

  async sendAIChat(message: string): Promise<AIChatResponse> {
    const token = localStorage.getItem("hcm_auth_token");
    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to consult AI Assistant");
    }
    return res.json();
  }
}

export const api = new ApiClient();
