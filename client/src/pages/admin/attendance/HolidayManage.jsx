import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { FiPlus, FiEdit2, FiTrash2, FiCalendar } from "react-icons/fi";
import { holidayService } from "../../../services/holidayService";
import Modal from "../../../components/ui/Modal.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Loader from "../../../components/ui/Loader.jsx";
import Tabs from "../../../components/ui/Tabs.jsx";

const emptyForm = { date: "", title: "", reason: "", notes: "", status: "active" };

/**
 * Fully admin-managed holiday list. Deliberately has NO preset list of
 * holiday names/dates anywhere in this file — every holiday is typed in
 * by the admin, for any date, with any title/reason they choose.
 */
const HolidayManage = () => {
  const [holidays, setHolidays] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [page, setPage] = useState(1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await holidayService.getAll({ year: yearFilter, page, limit: 20 });
      setHolidays(data.data);
      setMeta(data.meta);
    } catch (error) {
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  }, [yearFilter, page]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (holiday) => {
    setEditing(holiday);
    setForm({
      date: holiday.date.slice(0, 10),
      title: holiday.title,
      reason: holiday.reason,
      notes: holiday.notes || "",
      status: holiday.status,
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.date || !form.title.trim() || !form.reason.trim()) {
      toast.warn("Date, Title, and Reason are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await holidayService.update(editing._id, form);
        toast.success("Holiday updated");
      } else {
        await holidayService.create(form);
        toast.success("Holiday added");
      }
      setFormOpen(false);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save holiday");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await holidayService.remove(deleteTarget._id);
      toast.success("Holiday deleted");
      setDeleteTarget(null);
      fetchHolidays();
    } catch (error) {
      toast.error("Failed to delete holiday");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Attendance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage holidays — attendance is auto-disabled on these dates</p>
        </div>
        <button onClick={openAdd} className="btn-primary w-fit"><FiPlus /> Add Holiday</button>
      </div>

      <Tabs
        tabs={[
          { to: "/admin/attendance", label: "Mark Attendance", end: true },
          { to: "/admin/attendance/report", label: "Monthly Report" },
          { to: "/admin/attendance/holidays", label: "Holidays" },
        ]}
      />

      <div className="card">
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Year</label>
        <input
          type="number"
          value={yearFilter}
          onChange={(e) => { setYearFilter(Number(e.target.value)); setPage(1); }}
          className="input-field w-32"
        />
      </div>

      {loading ? (
        <Loader />
      ) : holidays.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <FiCalendar className="text-3xl text-slate-300" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No holidays added for {yearFilter} yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {holidays.map((h) => (
                  <tr key={h._id}>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {new Date(h.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{h.title}</td>
                    <td className="px-4 py-2.5 max-w-xs truncate text-slate-600 dark:text-slate-300">{h.reason}</td>
                    <td className="px-4 py-2.5"><Badge status={h.status}>{h.status}</Badge></td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(h)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-700"><FiEdit2 size={16} /></button>
                        <button onClick={() => setDeleteTarget(h)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><FiTrash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={meta.page} pages={meta.pages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
        </div>
      )}

      <Modal open={formOpen} title={editing ? "Edit Holiday" : "Add Holiday"} onClose={() => setFormOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Holiday Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
              placeholder="e.g. Annual Function, Heavy Rain, Staff Meeting..."
              maxLength={100}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Reason / Description</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              className="input-field"
              placeholder="Explain why attendance is disabled on this date"
              maxLength={500}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="input-field"
              maxLength={500}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">Inactive holidays don't block attendance — useful to disable one temporarily without deleting it.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Holiday"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this holiday?"
        message={`"${deleteTarget?.title}" on ${deleteTarget ? new Date(deleteTarget.date).toLocaleDateString() : ""} will be removed. Attendance will become allowed on this date again.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default HolidayManage;