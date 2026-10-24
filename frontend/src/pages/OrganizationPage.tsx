import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { UserSummary } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CalendarDays,
  Briefcase,
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";

export function OrganizationPage() {
  const { company, user } = useAuth();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const usersData = await api.getCompanyUsers();
      setUsers(usersData);
    } catch (err) {
      console.error("Failed to load organization data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (targetUser: UserSummary) => {
    if (targetUser.id === user?.id) {
      alert("You cannot deactivate your own administrative account.");
      return;
    }

    setUpdatingUserId(targetUser.id);
    try {
      const updated = await api.updateUserStatus(targetUser.id, !targetUser.isActive);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: updated.isActive } : u))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update user status");
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading organization data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organization Hub</h1>
          <p className="text-sm text-slate-500 mt-1">
            Company infrastructure, workspace policies, departments, and user account management.
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Navigation Cards to Sub-Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/departments"
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Building2 className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-sm text-slate-900">Departments</h3>
          <p className="text-xs text-slate-500 mt-1">Manage divisions and staff assignments</p>
        </Link>

        <Link
          to="/designations"
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Briefcase className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-sm text-slate-900">Designations</h3>
          <p className="text-xs text-slate-500 mt-1">Job roles and career bands</p>
        </Link>

        <Link
          to="/leave-policies"
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <CalendarDays className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-sm text-slate-900">Leave Policies</h3>
          <p className="text-xs text-slate-500 mt-1">Statutory annual leave quotas</p>
        </Link>

        <Link
          to="/holidays"
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-sm text-slate-900">Public Holidays</h3>
          <p className="text-xs text-slate-500 mt-1">Official annual calendar days</p>
        </Link>
      </div>

      {/* Grid: Company Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-brand-600" />
            <CardTitle className="text-base">Workspace Operating Profile</CardTitle>
          </div>
          <CardDescription>Operating details configured during first-run setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="block text-xs text-slate-400 uppercase font-semibold">Organization Name</span>
              <span className="text-base font-bold text-slate-900">{company?.name}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="block text-xs text-slate-400 uppercase font-semibold">Standard Timezone</span>
              <span className="text-base font-mono font-bold text-slate-900">{company?.timezone}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="block text-xs text-slate-400 uppercase font-semibold">Deployment State</span>
              <span className="inline-flex items-center text-sm font-semibold text-emerald-700 mt-0.5">
                <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-600" /> Initialized
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Accounts Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">User Identities & Access Status</CardTitle>
              <CardDescription>
                Server-side authorization and account activation/deactivation
              </CardDescription>
            </div>
            <Badge variant="outline">{users.length} Active System Accounts</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Account Status</th>
                  {user?.role === "ADMIN" && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center space-x-2">
                      <div className="h-7 w-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                        {account.fullName[0]}
                      </div>
                      <span>{account.fullName}</span>
                      {account.id === user?.id && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{account.email}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          account.role === "ADMIN"
                            ? "roleAdmin"
                            : account.role === "HR"
                            ? "roleHr"
                            : "roleEmployee"
                        }
                      >
                        {account.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {account.isActive ? (
                        <span className="inline-flex items-center text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs text-rose-700 font-medium">
                          <XCircle className="h-3.5 w-3.5 mr-1 text-rose-600" />
                          Deactivated
                        </span>
                      )}
                    </td>
                    {user?.role === "ADMIN" && (
                      <td className="px-4 py-3 text-right">
                        {account.id !== user.id ? (
                          <Button
                            variant={account.isActive ? "outline" : "default"}
                            size="sm"
                            isLoading={updatingUserId === account.id}
                            onClick={() => handleToggleStatus(account)}
                            className={
                              account.isActive
                                ? "text-rose-600 hover:bg-rose-50 border-rose-200"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }
                          >
                            {account.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Current User</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
