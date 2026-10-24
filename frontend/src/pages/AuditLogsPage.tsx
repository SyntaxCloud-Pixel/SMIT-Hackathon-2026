import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { AuditLogEntry } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, RotateCcw, Clock, Lock } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Audit Logs</h1>
            <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Admin Only
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable append-only trail recording initialization, authorization, and administrative events.
          </p>
        </div>
        <div className="mt-3 md:mt-0">
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Refresh Logs
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Recorded System Events</CardTitle>
            </div>
            <span className="text-xs text-slate-500 font-mono">{logs.length} Total Events</span>
          </div>
          <CardDescription>
            All critical changes are tracked with actor identity, timestamps, and state diffs. Secrets and tokens are automatically redacted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text="Querying audit entries..." />
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No audit events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-slate-400" />
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-brand-700">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {log.entityType} {log.entityId ? `(${log.entityId})` : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {log.actorEmail || log.actorUserId || "SYSTEM"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {log.afterData ? JSON.stringify(log.afterData) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
