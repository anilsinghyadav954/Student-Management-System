import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-toastify";
import { FiSearch, FiSave, FiRotateCcw, FiX } from "react-icons/fi";
import { marksService } from "../../../services/marksService";
import Loader from "../../../components/ui/Loader.jsx";
import Tabs from "../../../components/ui/Tabs.jsx";

const EXAM_TYPES = ["Unit Test", "Mid Term", "Final Term", "Quiz", "Assignment"];

const defaultFilters = {
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  class: "",
  section: "",
  subject: "",
  examType: "Unit Test",
  totalMarks: "",
  examDate: new Date().toISOString().split("T")[0],
};

/**
 * Bulk Marks Entry — lets an admin enter/edit marks for an entire class in
 * one screen instead of searching for each student individually (the
 * original single-student flow in MarksManage.jsx, which is left
 * completely untouched — this is a new, separate page).
 */
const BulkMarksEntry = () => {
  const navigate = useNavigate();
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gridLoaded, setGridLoaded] = useState(false);
  const inputRefs = useRef([]);

  const { register, control, handleSubmit, watch, setValue, reset, getValues } = useForm({
    defaultValues: { ...defaultFilters, records: [] },
  });

  const { fields, replace } = useFieldArray({ control, name: "records" });
  const totalMarks = watch("totalMarks");

  const handleLoadStudents = async () => {
    const { class: className, section, subject, examType, academicYear } = getValues();
    if (!className.trim() || !section.trim() || !subject.trim() || !examType || !academicYear.trim()) {
      toast.warn("Please fill in Class, Section, Subject, Exam Name, and Academic Session first");
      return;
    }

    setLoadingGrid(true);
    try {
      const { data } = await marksService.getBulkGrid({ class: className, section, subject, examType, academicYear });
      const { rows, existingTotalMarks, existingExamDate } = data.data;

      if (rows.length === 0) {
        toast.warn("No active students found for that class/section");
        replace([]);
        setGridLoaded(false);
        return;
      }

      replace(
        rows.map((row) => ({
          studentDbId: row.studentDbId,
          rollNumber: row.rollNumber,
          studentId: row.studentId,
          name: row.name,
          fatherName: row.fatherName,
          marksObtained: row.marksObtained === "" ? "" : String(row.marksObtained),
          isAbsent: row.isAbsent,
        }))
      );

      // Pre-fill Total Marks / Exam Date if this exam was already entered before
      if (existingTotalMarks && !getValues("totalMarks")) setValue("totalMarks", String(existingTotalMarks));
      if (existingExamDate) setValue("examDate", existingExamDate.split("T")[0]);

      setGridLoaded(true);
      toast.success(`Loaded ${rows.length} student(s)`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load students");
    } finally {
      setLoadingGrid(false);
    }
  };

  const handleReset = () => {
    handleLoadStudents(); // re-fetch the last-saved state, discarding unsaved edits
  };

  const handleEnterKey = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = inputRefs.current[index + 1];
      if (next) next.focus();
    }
  };

  const rowError = (index) => {
    const marks = watch(`records.${index}.marksObtained`);
    const isAbsent = watch(`records.${index}.isAbsent`);
    if (isAbsent || marks === "" || marks === undefined) return null;
    const num = Number(marks);
    const max = Number(totalMarks) || 0;
    if (num < 0) return "Cannot be negative";
    if (max > 0 && num > max) return `Cannot exceed ${max}`;
    return null;
  };

  const onSubmit = async (data) => {
    const rowsWithErrors = data.records
      .map((_, i) => rowError(i))
      .filter(Boolean);
    if (rowsWithErrors.length > 0) {
      toast.error(`Fix ${rowsWithErrors.length} invalid mark(s) before saving`);
      return;
    }
    if (!data.totalMarks || Number(data.totalMarks) < 1) {
      toast.warn("Total Marks must be at least 1");
      return;
    }

    setSaving(true);
    try {
      await marksService.bulkSave({
        class: data.class,
        section: data.section,
        subject: data.subject,
        examType: data.examType,
        academicYear: data.academicYear,
        examDate: data.examDate,
        totalMarks: Number(data.totalMarks),
        records: data.records.map((r) => ({
          student: r.studentDbId,
          marksObtained: r.isAbsent ? 0 : Number(r.marksObtained) || 0,
          isAbsent: r.isAbsent,
        })),
      });
      toast.success(`Saved marks for ${data.records.length} student(s)`);
    } catch (error) {
      const apiErrors = error.response?.data?.errors;
      if (apiErrors?.length) {
        toast.error(`${apiErrors.length} row(s) failed: ${apiErrors[0].message}`);
      } else {
        toast.error(error.response?.data?.message || "Failed to save marks");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Marks Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Enter marks for a single student or a whole class at once</p>
      </div>

      <Tabs
        tabs={[
          { to: "/admin/marks", label: "Individual Entry", end: true },
          { to: "/admin/marks/bulk", label: "Bulk Entry" },
          { to: "/admin/marks/export", label: "Export Results" },
        ]}
      />

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Academic Session</label>
            <input {...register("academicYear")} className="input-field" placeholder="2025-2026" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Class</label>
            <input {...register("class")} className="input-field" placeholder="e.g. 10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Section</label>
            <input {...register("section")} className="input-field" placeholder="e.g. A" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Subject</label>
            <input {...register("subject")} className="input-field" placeholder="e.g. Mathematics" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Exam Name</label>
            <select {...register("examType")} className="input-field">
              {EXAM_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Total Marks</label>
            <input {...register("totalMarks")} type="number" min="1" className="input-field" placeholder="100" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Exam Date</label>
            <input {...register("examDate")} type="date" className="input-field" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={handleLoadStudents} disabled={loadingGrid} className="btn-primary w-full">
              <FiSearch /> {loadingGrid ? "Loading..." : "Load Students"}
            </button>
          </div>
        </div>
      </div>

      {loadingGrid && <Loader />}

      {!loadingGrid && gridLoaded && fields.length > 0 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Admission No</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Father Name</th>
                    <th className="px-4 py-3">Present</th>
                    <th className="px-4 py-3">Marks Obtained</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {fields.map((field, index) => {
                    const isAbsent = watch(`records.${index}.isAbsent`);
                    const error = rowError(index);
                    const { ref: rhfRef, ...marksRest } = register(`records.${index}.marksObtained`);
                    return (
                      <tr key={field.id}>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{field.rollNumber}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{field.studentId}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{field.name}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{field.fatherName}</td>
                        <td className="px-4 py-2.5">
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!isAbsent}
                              onChange={(e) => setValue(`records.${index}.isAbsent`, !e.target.checked)}
                              className="h-4 w-4 rounded"
                            />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {isAbsent ? "Absent" : "Present"}
                            </span>
                          </label>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            min="0"
                            disabled={isAbsent}
                            placeholder={isAbsent ? "—" : "0"}
                            className={`input-field w-24 py-1.5 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""} ${isAbsent ? "cursor-not-allowed opacity-50" : ""}`}
                            onKeyDown={(e) => handleEnterKey(e, index)}
                            ref={(el) => {
                              rhfRef(el);
                              inputRefs.current[index] = el;
                            }}
                            {...marksRest}
                          />
                          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end dark:border-slate-700">
              <button type="button" onClick={() => navigate("/admin/marks")} className="btn-secondary">
                <FiX /> Cancel
              </button>
              <button type="button" onClick={handleReset} disabled={loadingGrid} className="btn-secondary">
                <FiRotateCcw /> Reset
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                <FiSave /> {saving ? "Saving..." : "Save All Marks"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default BulkMarksEntry;