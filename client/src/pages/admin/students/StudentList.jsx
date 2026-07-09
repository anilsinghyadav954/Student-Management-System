import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye, FiDownload, FiUsers } from "react-icons/fi";
import { studentService } from "../../../services/studentService";
import { downloadBlob } from "../../../utils/download";
import Modal from "../../../components/ui/Modal.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Loader from "../../../components/ui/Loader.jsx";
import StudentFormModal from "../../../components/students/StudentFormModal.jsx";

const StudentList = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await studentService.getAll({
        search: search || undefined,
        class: classFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setStudents(data.data);
      setMeta(data.meta);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, statusFilter, page]);

  useEffect(() => {
    // Debounce search input so we don't hit the API on every keystroke
    const timer = setTimeout(fetchStudents, 350);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await studentService.remove(deleteTarget._id);
      toast.success("Student deleted successfully");
      setDeleteTarget(null);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete student");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await studentService.export(format, {
        search: search || undefined,
        class: classFilter || undefined,
        status: statusFilter || undefined,
      });
      downloadBlob(response, `students-report.${format === "excel" ? "xlsx" : "pdf"}`);
      toast.success(`Exported as ${format === "excel" ? "Excel" : "PDF"}`);
    } catch (error) {
      toast.error("Export failed. Please try again.");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Students</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage all student records</p>
        </div>
        <button onClick={() => { setEditingStudent(null); setFormOpen(true); }} className="btn-primary w-fit">
          <FiPlus /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by name, email, roll no, or student ID"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-10"
            />
          </div>
          <input
            placeholder="Filter by class"
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
            className="input-field"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => handleExport("pdf")} className="btn-secondary text-xs">
            <FiDownload size={14} /> Export PDF
          </button>
          <button onClick={() => handleExport("excel")} className="btn-secondary text-xs">
            <FiDownload size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden !p-0">
        {loading ? (
          <div className="p-10"><Loader /></div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FiUsers className="text-3xl text-slate-300" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Class / Section</th>
                  <th className="px-4 py-3">Roll No.</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {student.profile?.profileImage?.url ? (
                          <img src={student.profile.profileImage.url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-400">
                            {student.profile?.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-white">{student.profile?.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{student.profile?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.studentId}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.class} - {student.section}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.rollNumber}</td>
                    <td className="px-4 py-3"><Badge status={student.status}>{student.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => navigate(`/admin/students/${student._id}`)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-700" aria-label="View">
                          <FiEye size={16} />
                        </button>
                        <button onClick={() => { setEditingStudent(student); setFormOpen(true); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-700" aria-label="Edit">
                          <FiEdit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteTarget(student)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" aria-label="Delete">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={meta.page} pages={meta.pages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
      </div>

      <Modal open={formOpen} title={editingStudent ? "Edit Student" : "Add Student"} onClose={() => setFormOpen(false)} maxWidth="max-w-2xl">
        <StudentFormModal
          student={editingStudent}
          onSuccess={() => { setFormOpen(false); fetchStudents(); }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this student?"
        message={`This will permanently delete ${deleteTarget?.profile?.name}'s account, attendance, and marks. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default StudentList;
