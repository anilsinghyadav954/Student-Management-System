import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { studentService } from "../../services/studentService";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  class: "",
  section: "",
  rollNumber: "",
  dateOfBirth: "",
  gender: "Male",
  bloodGroup: "",
  guardianName: "",
  guardianPhone: "",
  status: "active",
};

// Defined OUTSIDE the parent component so it has a stable identity across
// re-renders. Previously this was declared inside StudentFormModal's body,
// which meant a brand-new component function was created on every
// keystroke (every setForm call). React treats a new function reference as
// a different component type, so it unmounted and remounted the underlying
// <input> DOM node on every render — which is why focus was lost after
// every single character typed.
const Field = ({ label, name, type = "text", value, error, onChange, ...rest }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      className={`input-field ${error ? "border-red-400" : ""}`}
      {...rest}
    />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

/**
 * Shared form for both creating and editing a student. `student` prop
 * being non-null puts the form in edit mode (hides password/email fields,
 * since those aren't editable through this screen).
 */
const StudentFormModal = ({ student, onSuccess, onCancel }) => {
  const isEdit = !!student;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        name: student.profile?.name || "",
        email: student.profile?.email || "",
        password: "",
        phone: student.profile?.phone || "",
        class: student.class || "",
        section: student.section || "",
        rollNumber: student.rollNumber || "",
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "",
        gender: student.gender || "Male",
        bloodGroup: student.bloodGroup || "",
        guardianName: student.guardian?.name || "",
        guardianPhone: student.guardian?.phone || "",
        status: student.status || "active",
      });
    }
  }, [student]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!isEdit) {
      if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
      if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    }
    if (form.phone && !/^[0-9]{10}$/.test(form.phone)) e.phone = "Phone must be 10 digits";
    if (!form.class.trim()) e.class = "Class is required";
    if (!form.section.trim()) e.section = "Section is required";
    if (!form.rollNumber.trim()) e.rollNumber = "Roll number is required";
    if (!form.dateOfBirth) e.dateOfBirth = "Date of birth is required";
    if (!form.guardianName.trim()) e.guardianName = "Guardian name is required";
    if (!/^[0-9]{10}$/.test(form.guardianPhone)) e.guardianPhone = "Guardian phone must be 10 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        await studentService.update(student._id, {
          name: form.name,
          phone: form.phone,
          class: form.class,
          section: form.section,
          rollNumber: form.rollNumber,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          guardian: { name: form.guardianName, phone: form.guardianPhone },
          status: form.status,
        });
        toast.success("Student updated successfully");
      } else {
        await studentService.create({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          class: form.class,
          section: form.section,
          rollNumber: form.rollNumber,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          guardian: { name: form.guardianName, phone: form.guardianPhone },
        });
        toast.success("Student created successfully");
      }
      onSuccess();
    } catch (error) {
      const apiErrors = error.response?.data?.errors;
      if (apiErrors) {
        const mapped = {};
        apiErrors.forEach((err) => {
          const key = err.field?.split(".")[0]?.replace("guardian", "guardianName") || err.field;
          mapped[key] = err.message;
        });
        setErrors(mapped);
      }
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name" name="name" value={form.name} error={errors.name} onChange={handleChange} />
{!isEdit && <Field label="Email" name="email" type="email" autoComplete="off" value={form.email} error={errors.email} onChange={handleChange} />}
{!isEdit && <Field label="Password" name="password" type="password" autoComplete="new-password" value={form.password} error={errors.password} onChange={handleChange} />}
        <Field label="Phone" name="phone" placeholder="10-digit number" value={form.phone} error={errors.phone} onChange={handleChange} />
        <Field label="Class" name="class" placeholder="e.g. 10" value={form.class} error={errors.class} onChange={handleChange} />
        <Field label="Section" name="section" placeholder="e.g. A" value={form.section} error={errors.section} onChange={handleChange} />
        <Field label="Roll Number" name="rollNumber" value={form.rollNumber} error={errors.rollNumber} onChange={handleChange} />
        <Field label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} error={errors.dateOfBirth} onChange={handleChange} />
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Gender</label>
          <select name="gender" value={form.gender} onChange={handleChange} className="input-field">
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Blood Group</label>
          <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className="input-field">
            <option value="">Select</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
              <option key={bg}>{bg}</option>
            ))}
          </select>
        </div>
        <Field label="Guardian Name" name="guardianName" value={form.guardianName} error={errors.guardianName} onChange={handleChange} />
        <Field label="Guardian Phone" name="guardianPhone" placeholder="10-digit number" value={form.guardianPhone} error={errors.guardianPhone} onChange={handleChange} />
        {isEdit && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Student"}
        </button>
      </div>
    </form>
  );
};

export default StudentFormModal;