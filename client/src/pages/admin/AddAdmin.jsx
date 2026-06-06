import { useState } from "react";
import { motion } from "framer-motion";
import {
    User,
    Mail,
    Lock,
    Phone,
    Eye,
    EyeOff,
    Plus,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building2,
    ShieldCheck,
} from "lucide-react";
import adminService from "../../api/adminService";

const ROLES_WITHOUT_DEPARTMENT = new Set(["Super Admin", "Front Desk Admin"]);

function Input({ icon, error, ...props }) {
    return (
        <div className="relative">
            <div className="absolute left-3 top-3 text-slate-400">{icon}</div>
            <input
                {...props}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all
                    ${
                        error
                            ? "border-red-300 focus:ring-red-200"
                            : "border-slate-200 focus:ring-blue-200 focus:border-blue-400"
                    }`}
            />
            {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
        </div>
    );
}

function SelectField({ icon, label, options, error, ...props }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {label}
            </label>
            <div className="relative">
                <div className="absolute left-3 top-3 text-slate-400">
                    {icon}
                </div>
                <select
                    {...props}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm appearance-none bg-white focus:outline-none focus:ring-2 transition-all
                        ${
                            error
                                ? "border-red-300 focus:ring-red-200"
                                : "border-slate-200 focus:ring-blue-200 focus:border-blue-400"
                        }`}
                >
                    <option value="">{props.placeholder || `Select ${label}`}</option>
                    {options.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            </div>
            {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
        </div>
    );
}

export default function AddAdmin() {
    const [showPass, setShowPass] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        admin_role: "",
        department: "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newForm = { ...form, [name]: value };

        // Roles with global scope don't require department
        if (name === "admin_role" && ROLES_WITHOUT_DEPARTMENT.has(value)) {
            newForm.department = "";
        }

        setForm(newForm);
        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Full name is required.";
        if (!form.email.trim()) e.email = "Email is required.";
        if (!form.password) e.password = "Password is required.";
        if (form.password.length < 8)
            e.password = "Password must be at least 8 characters.";
        if (!form.admin_role) e.admin_role = "Admin role is required.";

        // Department is required only for department-scoped admin roles
        if (!ROLES_WITHOUT_DEPARTMENT.has(form.admin_role) && !form.department) {
            e.department = "Department is required.";
        }
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError("");

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        try {
            await adminService.createAdmin(form);
            setSuccess(true);
            setForm({
                name: "",
                email: "",
                password: "",
                phone: "",
                admin_role: "",
                department: "",
            });
        } catch (err) {
            if (err.response?.data?.errors) {
                const firstError = Object.values(
                    err.response.data.errors,
                )[0][0];
                setApiError(firstError);
            } else {
                setApiError(
                    err.response?.data?.message ||
                        "Something went wrong. Please try again.",
                );
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#eff6ff] flex items-center justify-center px-4">
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center"
                >
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{
                            background:
                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                        }}
                    >
                        <CheckCircle2 size={32} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">
                        Admin Account Created!
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        The new admin can now log in with their credentials.
                    </p>
                    <button
                        onClick={() => setSuccess(false)}
                        className="px-6 py-2.5 rounded-full text-white font-semibold text-sm"
                        style={{
                            background:
                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                        }}
                    >
                        Add Another Admin
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto px-4 py-12"
        >
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 80 }}
                className="bg-white rounded-2xl shadow-lg p-8"
            >
                <h2 className="text-2xl font-bold mb-2">Register New Admin</h2>
                <p className="text-slate-500 mb-8">
                    Grant system-wide administrative privileges to a new team
                    member.
                </p>

                {apiError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
                        <AlertCircle size={16} />
                        {apiError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Full Name
                            </label>
                            <Input
                                icon={<User size={16} />}
                                placeholder="e.g. Sarah Ahmed"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                error={errors.name}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email Address
                            </label>
                            <Input
                                icon={<Mail size={16} />}
                                placeholder="sarah@pulseportal.com"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                error={errors.email}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Input
                                    icon={<Lock size={18} />}
                                    type={showPass ? "text" : "password"}
                                    placeholder="Min 8 chars, uppercase, number"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    error={errors.password}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                >
                                    {showPass ? (
                                        <EyeOff size={14} />
                                    ) : (
                                        <Eye size={14} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Phone (optional)
                            </label>
                            <Input
                                icon={<Phone size={16} />}
                                placeholder="+8801700-000000"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Admin Role Dropdown */}
                        <SelectField
                            label="Admin Role"
                            icon={<ShieldCheck size={16} />}
                            name="admin_role"
                            value={form.admin_role}
                            onChange={handleChange}
                            error={errors.admin_role}
                            options={[
                                "Super Admin",
                                "IT Support Admin",
                                "Department Admin",
                                "Front Desk Admin",
                            ]}
                        />

                        {/* Department Dropdown */}
                        <SelectField
                            label="Department"
                            icon={<Building2 size={16} />}
                            name="department"
                            value={ROLES_WITHOUT_DEPARTMENT.has(form.admin_role) ? "" : form.department}
                            onChange={handleChange}
                            error={errors.department}
                            disabled={ROLES_WITHOUT_DEPARTMENT.has(form.admin_role)}
                            placeholder={ROLES_WITHOUT_DEPARTMENT.has(form.admin_role) ? "Department Not Required" : "Select Department"}
                            options={[
                                "Anesthesiology",
                                "Breast Surgery",
                                "Cardiac & Vascular Surgery",
                                "Cardiology",
                                "Child Development",
                                "Clinical Hematology",
                                "Colorectal & Laparoscopic Surgery",
                                "Dental Care, Orthodontics & Maxillofacial Surgery",
                                "Dermatology",
                                "Diet and Nutrition",
                                "ENT, Head & Neck Surgery",
                                "Endocrinology",
                                "Gastroenterology",
                                "General Surgery",
                                "Gyne & Gyne Oncology",
                                "IVF",
                                "Internal Medicine",
                                "Laboratory & Pathology Medicine",
                                "Microbiology",
                                "Neonatology",
                                "Nephrology",
                                "Neuro & Critical Care",
                                "Neuro ICU",
                                "Neuro Surgery",
                                "Neurology",
                                "Neuromedicine",
                                "OBGYN",
                                "Oncology",
                                "Ophthalmology",
                                "Orthopedics",
                                "Paediatric Cardiology",
                                "Paediatric Hemato-Oncology",
                                "Paediatric Nephrology",
                                "Paediatric Surgery",
                                "Paediatrics",
                                "Pain Medicine",
                                "Physical Medicine & Rehabilitation",
                                "Plastic Surgery",
                                "Psychiatry",
                                "Radiology & Imaging",
                                "Respiratory Medicine",
                                "Rheumatology",
                                "Transfusion Medicine",
                                "Urology",
                            ]}
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: loading ? 1 : 1.03 }}
                        whileTap={{ scale: loading ? 1 : 0.95 }}
                        type="submit"
                        disabled={loading}
                        className="w-auto mx-auto mt-8 py-2.5 px-6 rounded-full text-white text-sm font-semibold shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{
                            background:
                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />{" "}
                                Creating...
                            </>
                        ) : (
                            <>
                                <Plus size={18} /> Create Admin Account
                            </>
                        )}
                    </motion.button>
                </form>
            </motion.div>
        </motion.div>
    );
}
