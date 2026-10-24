import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Announcement } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Megaphone,
  Pin,
  Plus,
  Trash2,
  Calendar,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";

export function AnnouncementsPage() {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === "ADMIN" || user?.role === "HR";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load announcements");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      setErrorMsg("Please provide both a title and notice content.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        isPinned,
      });
      setSuccessMsg("Announcement published to all workspace members.");
      setIsCreateOpen(false);
      setTitle("");
      setContent("");
      setIsPinned(false);
      await fetchAnnouncements();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this announcement?")) return;
    try {
      await api.deleteAnnouncement(id);
      setSuccessMsg("Announcement deleted.");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete announcement");
    }
  };

  if (isLoading && announcements.length === 0) {
    return <LoadingSpinner text="Loading company bulletin board..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Announcements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Broadcast official notices, organizational policy updates, and executive bulletins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAnnouncements} disabled={isLoading}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          {isAdminOrHR && (
            <Button
              size="sm"
              className="bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Publish Notice
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-start gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{successMsg}</div>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card className="p-12 text-center border-slate-200 bg-white">
            <Megaphone className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No Announcements Posted</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are currently no active bulletins. HR or Admin administrators can publish company-wide notices anytime.
            </p>
          </Card>
        ) : (
          announcements.map((a) => (
            <Card
              key={a.id}
              className={`border transition-all ${
                a.isPinned
                  ? "border-brand-300 bg-gradient-to-r from-indigo-50/40 via-white to-white shadow-sm"
                  : "border-slate-200 bg-white shadow-sm hover:shadow"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {a.isPinned && (
                        <Badge variant="outline" className="bg-brand-50 text-brand-700 border-brand-200 text-[10px]">
                          <Pin className="h-3 w-3 mr-1 rotate-45" />
                          Pinned Bulletin
                        </Badge>
                      )}
                      <CardTitle className="text-base font-bold text-slate-900">{a.title}</CardTitle>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-slate-500">
                        <User className="h-3.5 w-3.5" />
                        {a.authorName || "HR Department"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(a.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {isAdminOrHR && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {a.content}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Publish Notice Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Publish Company Notice"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Title</label>
            <input
              type="text"
              placeholder="e.g. Office Relocation & Working Hours Update"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Content</label>
            <textarea
              rows={5}
              placeholder="Provide complete details, policies, dates, and instructions for team members..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="pinned-checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="pinned-checkbox" className="text-xs font-medium text-slate-700 cursor-pointer">
              Pin to top of bulletin board for all employees
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold"
              onClick={handleCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Publishing..." : "Publish Bulletin"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
