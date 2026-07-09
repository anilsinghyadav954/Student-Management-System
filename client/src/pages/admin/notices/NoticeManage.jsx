import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { FiPlus, FiEdit2, FiTrash2, FiBell, FiBookmark, } from "react-icons/fi";
import { noticeService } from "../../../services/noticeService";
import Modal from "../../../components/ui/Modal.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Loader from "../../../components/ui/Loader.jsx";

const emptyForm = { title: "", description: "", audience: "all", targetClass: "", priority: "normal", isPinned: false };

const NoticeManage = () => {
  const [notices, setNotices] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await noticeService.getAll({ page, limit: 10 });
      setNotices(data.data);
      setMeta(data.meta);
    } catch (error) {
      toast.error("Failed to load notices");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (notice) => {
    setEditing(notice);
    setForm({
      title: notice.title,
      description: notice.description,
      audience: notice.audience,
      targetClass: notice.targetClass || "",
      priority: notice.priority,
      isPinned: notice.isPinned,
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.warn("Title and description are required");
      return;
    }
    if (form.audience === "class" && !form.targetClass.trim()) {
      toast.warn("Target class is required when audience is 'Specific Class'");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await noticeService.update(editing._id, form);
        toast.success("Notice updated");
      } else {
        await noticeService.create(form);
        toast.success("Notice published");
      }
      setFormOpen(false);
      fetchNotices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save notice");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await noticeService.remove(deleteTarget._id);
      toast.success("Notice deleted");
      setDeleteTarget(null);
      fetchNotices();
    } catch (error) {
      toast.error("Failed to delete notice");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notice Board</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Publish announcements for students</p>
        </div>
        <button onClick={openAdd} className="btn-primary w-fit"><FiPlus /> New Notice</button>
      </div>

      {loading ? (
        <Loader />
      ) : notices.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <FiBell className="text-3xl text-slate-300" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No notices posted yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div key={notice._id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {notice.isPinned && <FiBookmark className="text-primary-600 dark:text-primary-400" size={14} />}
                    <h3 className="font-semibold text-slate-900 dark:text-white break-words">{notice.title}</h3>
                    <Badge status={notice.priority}>{notice.priority}</Badge>
                    <Badge status="normal">{notice.audience === "class" ? `Class ${notice.targetClass}` : "All Students"}</Badge>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">{notice.description}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    By {notice.postedBy?.name} · {new Date(notice.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button onClick={() => openEdit(notice)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-700"><FiEdit2 size={16} /></button>
                  <button onClick={() => setDeleteTarget(notice)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><FiTrash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
          <div className="card !p-0">
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
          </div>
        </div>
      )}

      <Modal open={formOpen} title={editing ? "Edit Notice" : "New Notice"} onClose={() => setFormOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" maxLength={150} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="input-field" maxLength={3000} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Audience</label>
              <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="input-field">
                <option value="all">All Students</option>
                <option value="class">Specific Class</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          {form.audience === "class" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Target Class</label>
              <input value={form.targetClass} onChange={(e) => setForm({ ...form, targetClass: e.target.value })} className="input-field" placeholder="e.g. 10" />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="rounded" />
            Pin this notice to the top
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Publish"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this notice?"
        message={`"${deleteTarget?.title}" will be permanently removed.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default NoticeManage;
