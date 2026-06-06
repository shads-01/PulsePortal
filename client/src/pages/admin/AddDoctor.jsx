import { useState } from "react";
import { motion } from "framer-motion";
import {
    User,
    Briefcase,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import adminService from "../../api/adminService";

const Motion = motion;

const DEPARTMENTS = [
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
];

const DAY_LIST = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function Input({ label, error, ...props }) {
    return (
        <div className="mb-4">
            <p className="text-sm mb-1 font-medium text-slate-700">{label}</p>
            <input
                {...props}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all
                    ${
                        error
                            ? "border-red-300 focus:ring-red-200"
                            : "border-slate-200 focus:ring-blue-200 focus:border-blue-400"
                    }`}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

function SectionTitle({ icon, title }) {
    return (
        <div className="flex items-center gap-2 mb-4 mt-2">
            <div className="text-blue-500">{icon}</div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
        </div>
    );
}

export default function AddDoctor() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        specialization: "",
        department: "",
        bio: "",
        consultation_fee: "",
        availability_days: [],
        service_start_time: "09:00",
        service_end_time: "17:00",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        // Clear error for this field when user types
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: "" });
        }
    };

    const toggleDay = (day) => {
        setForm((prev) => ({
            ...prev,
            availability_days: prev.availability_days.includes(day)
                ? prev.availability_days.filter((d) => d !== day)
                : [...prev.availability_days, day],
        }));
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Full name is required.";
        if (!form.email.trim()) e.email = "Email is required.";
        if (!form.password) e.password = "Password is required.";
        if (form.password.length < 8)
            e.password = "Password must be at least 8 characters.";
        if (!form.specialization.trim())
            e.specialization = "Department / Specialization is required.";
        if (form.availability_days.length > 0 && !form.service_start_time) {
            e.service_start_time = "Service start time is required when availability days are selected.";
        }
        if (form.availability_days.length > 0 && !form.service_end_time) {
            e.service_end_time = "Service end time is required when availability days are selected.";
        }
        if (
            form.service_start_time &&
            form.service_end_time &&
            form.service_start_time >= form.service_end_time
        ) {
            e.service_end_time = "Service end time must be after start time.";
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
            await adminService.createDoctor({
                ...form,
                consultation_fee: form.consultation_fee
                    ? parseFloat(form.consultation_fee)
                    : 0,
            });
            setSuccess(true);
            setForm({
                name: "",
                email: "",
                password: "",
                phone: "",
                specialization: "",
                department: "",
                bio: "",
                consultation_fee: "",
                availability_days: [],
                service_start_time: "09:00",
                service_end_time: "17:00",
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
                        Doctor Account Created!
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        The doctor can now log in with their credentials.
                    </p>
                    <button
                        onClick={() => setSuccess(false)}
                        className="px-6 py-2.5 rounded-full text-white font-semibold text-sm"
                        style={{
                            background:
                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                        }}
                    >
                        Add Another Doctor
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div
            className="max-w-6xl mx-auto px-6 py-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-1">Register New Doctor</h2>
                <p className="text-slate-500 mb-6">
                    Create a professional profile and credentials for a new
                    practitioner.
                </p>

                {apiError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
                        <AlertCircle size={16} />
                        {apiError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* LEFT — Personal Info */}
                        <div>
                            <SectionTitle
                                icon={<User size={18} />}
                                title="Personal Information"
                            />
                            <Input
                                label="Full Name"
                                name="name"
                                placeholder="Dr. John Smith"
                                value={form.name}
                                onChange={handleChange}
                                error={errors.name}
                            />
                            <Input
                                label="Email"
                                name="email"
                                type="email"
                                placeholder="doctor@pulseportal.com"
                                value={form.email}
                                onChange={handleChange}
                                error={errors.email}
                            />
                            <Input
                                label="Password"
                                name="password"
                                type="password"
                                placeholder="Min 8 chars, uppercase, number"
                                value={form.password}
                                onChange={handleChange}
                                error={errors.password}
                            />
                            <Input
                                label="Phone (optional)"
                                name="phone"
                                placeholder="+8801700-000000"
                                value={form.phone}
                                onChange={handleChange}
                            />
                        </div>

                        {/* RIGHT — Professional Details */}
                        <div>
                            <SectionTitle
                                icon={<Briefcase size={18} />}
                                title="Professional Details"
                            />

                            {/* Department / Specialization */}
                            <div className="mb-4">
                                <p className="text-sm mb-1 font-medium text-slate-700">
                                    Department / Specialization
                                </p>
                                <select
                                    name="specialization"
                                    value={form.specialization}
                                    onChange={(e) => {
                                        // Set both specialization and department to the same value
                                        setForm((prev) => ({
                                            ...prev,
                                            specialization: e.target.value,
                                            department: e.target.value,
                                        }));
                                    }}
                                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all
                                        ${
                                            errors.specialization
                                                ? "border-red-300 focus:ring-red-200"
                                                : "border-slate-200 focus:ring-blue-200 focus:border-blue-400"
                                        }`}
                                >
                                    <option value="">Select department</option>
                                    {DEPARTMENTS.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                                {errors.specialization && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.specialization}
                                    </p>
                                )}
                            </div>

                            <Input
                                label="Consultation Fee ($)"
                                name="consultation_fee"
                                type="number"
                                placeholder="e.g. 50"
                                value={form.consultation_fee}
                                onChange={handleChange}
                            />

                            {/* Bio */}
                            <div className="mb-4">
                                <p className="text-sm mb-1 font-medium text-slate-700">
                                    Bio (optional)
                                </p>
                                <textarea
                                    name="bio"
                                    value={form.bio}
                                    onChange={handleChange}
                                    placeholder="Brief professional background..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all resize-none"
                                />
                            </div>

                            {/* Available Days */}
                            <div className="mt-2">
                                <p className="text-sm mb-2 font-medium text-slate-700">
                                    Available Days
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {DAY_LIST.map((day) => (
                                        <motion.button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`px-4 py-1.5 rounded-full text-sm border transition-colors font-medium ${
                                                form.availability_days.includes(
                                                    day,
                                                )
                                                    ? "bg-blue-500 text-white border-blue-500"
                                                    : "text-slate-600 border-slate-300 hover:border-blue-300"
                                            }`}
                                        >
                                            {day}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3 mt-4">
                                <Input
                                    label="Service Starts"
                                    name="service_start_time"
                                    type="time"
                                    value={form.service_start_time}
                                    onChange={handleChange}
                                    error={errors.service_start_time}
                                />
                                <Input
                                    label="Service Ends"
                                    name="service_end_time"
                                    type="time"
                                    value={form.service_end_time}
                                    onChange={handleChange}
                                    error={errors.service_end_time}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-10">
                        <motion.button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-semibold text-sm disabled:opacity-60"
                            style={{
                                background:
                                    "linear-gradient(135deg, #0a5bbf, #127fec)",
                            }}
                            whileHover={{ scale: loading ? 1 : 1.05 }}
                            whileTap={{ scale: loading ? 1 : 0.95 }}
                        >
                            {loading ? (
                                <>
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />{" "}
                                    Creating...
                                </>
                            ) : (
                                "Create Doctor Account"
                            )}
                        </motion.button>
                    </div>
                </form>
            </div>
        </motion.div>
    );
}
