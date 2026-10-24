import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import {
  EmployeeProfile,
  Department,
  Designation,
} from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Plus,
  Search,
  Download,
  Upload,
  RotateCcw,
  Building2,
  Calendar,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { EmployeeRegistrationModal } from "./EmployeeRegistrationModal";
import { EmployeeCsvModal } from "./EmployeeCsvModal";

export function EmployeesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHrOrAdmin = user?.role === "ADMIN" || user?.role === "HR";

  // Data states
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [desigFilter, setDesigFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("fullName");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);

  const fetchFilters = async () => {
    try {
      const [dRes, desRes] = await Promise.all([
        api.getDepartments({ pageSize: 100 }),
        api.getDesignations({ pageSize: 100 }),
      ]);
      setDepartments(dRes.items);
      setDesignations(desRes.items);
    } catch (err) {
      console.error("Failed to load departments or designations", err);
    }
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await api.getEmployees({
        search: search.trim() || undefined,
        departmentId: deptFilter === "all" ? undefined : deptFilter,
        designationId: desigFilter === "all" ? undefined : desigFilter,
        employmentStatus: statusFilter === "all" ? undefined : statusFilter,
        page,
        pageSize: 10,
        sortBy,
        sortOrder,
      });
      setEmployees(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error("Failed to load employee directory", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [page, deptFilter, desigFilter, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  const handleClearFilters = () => {
    setSearch("");
    setDeptFilter("all");
    setDesigFilter("all");
    setStatusFilter("all");
    setSortBy("fullName");
    setSortOrder("ASC");
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      await api.downloadEmployeesCsv({
        search: search.trim() || undefined,
        departmentId: deptFilter === "all" ? undefined : deptFilter,
        designationId: desigFilter === "all" ? undefined : desigFilter,
        employmentStatus: statusFilter === "all" ? undefined : statusFilter,
      });
    } catch (err: any) {
      alert(err.message || "Failed to download employee CSV");
    }
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    deptFilter !== "all" ||
    desigFilter !== "all" ||
    statusFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse, search, and manage your workforce accounts and employment profiles.
          </p>
        </div>

        {isHrOrAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCsvOpen(true)}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setIsRegisterOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Register Employee
            </Button>
          </div>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, employee code, or work email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm w-full rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm"
                />
              </div>
              <Button type="submit" variant="secondary" size="default">
                Search
              </Button>
            </form>

            <div className="flex items-center space-x-2 self-end md:self-auto">
              <Button variant="ghost" size="icon" onClick={() => fetchEmployees()} title="Refresh directory">
                <RotateCcw className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center text-slate-500 mr-1 font-semibold uppercase text-[10px]">
              <SlidersHorizontal className="h-3 w-3 mr-1" />
              Filter By:
            </div>

            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 outline-none text-xs"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={desigFilter}
              onChange={(e) => {
                setDesigFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 outline-none text-xs"
            >
              <option value="all">All Designations</option>
              {designations.map((des) => (
                <option key={des.id} value={des.id}>
                  {des.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 outline-none text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="TERMINATED">Terminated</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so as any);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 outline-none text-xs"
            >
              <option value="fullName-ASC">Sort: Name (A-Z)</option>
              <option value="fullName-DESC">Sort: Name (Z-A)</option>
              <option value="employeeCode-ASC">Sort: Code (Asc)</option>
              <option value="joiningDate-DESC">Sort: Joining Date (Newest)</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 text-xs text-rose-600 hover:text-rose-700"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Workforce Registry</CardTitle>
            <span className="text-xs text-slate-500 font-medium">
              Showing {employees.length} of {total} employees
            </span>
          </div>
          <CardDescription>
            Live employee directory with server-side filtering, role scoping, and profile navigation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text="Retrieving employee directory..." />
          ) : employees.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8 text-brand-600" />}
              title="No Employees Registered"
              description={
                hasActiveFilters
                  ? "No employee records match the current filter selection."
                  : "No employees have been registered yet. Add your first team member."
              }
              actionLabel={isHrOrAdmin ? "Register Employee" : undefined}
              onAction={isHrOrAdmin ? () => setIsRegisterOpen(true) : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-4 py-3">Joining Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {emp.fullName[0]}
                          </div>
                          <div>
                            <Link
                              to={`/employees/${emp.id}`}
                              className="font-semibold text-slate-900 hover:text-brand-600 transition-colors block"
                            >
                              {emp.fullName}
                            </Link>
                            <span className="text-xs text-slate-500">{emp.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-800">
                        {emp.employeeCode}
                      </td>

                      <td className="px-4 py-3.5 text-slate-700">
                        <span className="inline-flex items-center text-xs">
                          <Building2 className="h-3 w-3 mr-1 text-slate-400" />
                          {emp.departmentName || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-700 text-xs">
                        {emp.designationName || "—"}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-slate-400" />
                          {emp.joiningDate}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            emp.employmentStatus === "ACTIVE"
                              ? "success"
                              : emp.employmentStatus === "ON_LEAVE"
                              ? "warning"
                              : "destructive"
                          }
                          className="capitalize text-[11px]"
                        >
                          {emp.employmentStatus.replace("_", " ").toLowerCase()}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/employees/${emp.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Profile
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 px-2">
                  <span className="text-xs text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* REGISTRATION MODAL */}
      <EmployeeRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={() => {
          fetchEmployees();
        }}
      />

      {/* CSV IMPORT MODAL */}
      <EmployeeCsvModal
        isOpen={isCsvOpen}
        onClose={() => setIsCsvOpen(false)}
        onSuccess={() => {
          fetchEmployees();
        }}
      />
    </div>
  );
}
