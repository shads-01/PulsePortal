import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CalendarPlus,
    CalendarCheck,
    Bot,
    MapPin,
    ChevronRight,
    Stethoscope,
    BedDouble,
    Building2,
    CalendarDays,
    AlarmClock,
    Sparkles,
    Loader2,
    Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AIChatPanel from "../../components/AIChatPanel";
import appointmentService from "../../api/appointmentService";
import authService from "../../api/authService";
import roomAdmissionService from "../../api/roomAdmissionService";

const Motion = motion;

const TODAY = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
});

const STATUS_STYLES = {
    confirmed: "bg-blue-50 text-blue-600 border border-blue-100",
    pending: "bg-amber-50 text-amber-600 border border-amber-100",
    completed: "bg-green-50 text-green-600 border border-green-100",
    cancelled: "bg-red-50 text-red-400 border border-red-100",
};

const ADMISSION_STATUS_STYLES = {
    pending: "bg-amber-50 text-amber-700 border border-amber-100",
    admitted: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    transfer: "bg-sky-50 text-sky-700 border border-sky-100",
    discharged: "bg-slate-100 text-slate-600 border border-slate-200",
    cancelled: "bg-rose-50 text-rose-600 border border-rose-100",
};

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(
        dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr,
    );
    return isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          });
}

function formatTime(timeStr) {
    if (!timeStr) return "—";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function ActionCard({ icon: Icon, title, description, label, onClick, isAI }) {
    const IconComponent = Icon;

    return (
        <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            className={`flex flex-col gap-3 p-6 cursor-pointer select-none relative overflow-hidden bg-white/90
                        ${isAI ? "ai-border-glow" : "rounded-3xl shadow-sm border border-slate-100"}`}
        >
            {isAI && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#127fec] text-[10px] font-bold uppercase tracking-wide">
                    <Sparkles size={9} />
                    AI Powered
                </span>
            )}
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-50 text-[#127fec]">
                <IconComponent size={22} />
            </div>
            <div>
                <p className="text-[15px] font-semibold text-slate-800">
                    {title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {description}
                </p>
            </div>
            <button className="mt-auto self-start flex items-center gap-1 py-1 px-3 text-xs font-semibold border rounded-full transition-colors text-[#127fec] border-[#127fec] hover:bg-[#127fec] hover:text-white hover:border-transparent bg-transparent">
                {label} <ChevronRight size={13} />
            </button>
        </motion.div>
    );
}

function AppointmentCard({ appt }) {
    const statusCls = STATUS_STYLES[appt.status] || STATUS_STYLES.pending;
    const accentColor =
        appt.status === "pending"
            ? "linear-gradient(180deg, #f59e0b, #fbbf24)"
            : appt.status === "confirmed"
              ? "linear-gradient(180deg, #0a5bbf, #127fec)"
              : appt.status === "completed"
                ? "linear-gradient(180deg, #16a34a, #22c55e)"
                : "linear-gradient(180deg, #f87171, #ef4444)";

    return (
        <div className="bg-white/90 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex">
                <div
                    className="w-1 flex-shrink-0"
                    style={{ background: accentColor }}
                />
                <div className="flex-1 p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide capitalize ${statusCls}`}
                        >
                            {appt.status}
                        </span>
                        <span className="text-slate-400 text-xs">
                            {appt.type === "in_person" ? "In-Person" : "Online"}
                        </span>
                    </div>

                    <p className="text-xl font-bold text-slate-800">
                        {appt.doctor_name}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {appt.specialization}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            <CalendarDays
                                size={13}
                                className="text-[#127fec]"
                            />
                            {formatDate(appt.appointment_date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            <AlarmClock size={13} className="text-[#127fec]" />
                            {formatTime(appt.appointment_time)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            {appt.type === "online" ? (
                                <>
                                    <Video
                                        size={13}
                                        className="text-[#127fec]"
                                    />{" "}
                                    Online
                                </>
                            ) : (
                                <>
                                    <MapPin
                                        size={13}
                                        className="text-[#127fec]"
                                    />{" "}
                                    In-Person
                                </>
                            )}
                        </span>
                        {appt.doctor_service_hours && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                                <AlarmClock size={13} className="text-[#127fec]" />
                                Service {appt.doctor_service_hours}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AdmissionCard({ admission }) {
    const statusCls =
        ADMISSION_STATUS_STYLES[admission.status] ||
        ADMISSION_STATUS_STYLES.pending;

    return (
        <div className="bg-white/90 rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-800">
                        {admission.room_number || "Room pending"} · Bed {admission.bed_label || "—"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {admission.admission_no} · {admission.department || "General"}
                    </p>
                </div>
                <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide capitalize ${statusCls}`}
                >
                    {admission.status}
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    <Building2 size={13} className="text-[#127fec]" />
                    {admission.attending_doctor || "Doctor not assigned"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    <BedDouble size={13} className="text-[#127fec]" />
                    {admission.admission_type || "General"} · {admission.priority || "Normal"}
                </span>
            </div>

            <p className="text-xs text-slate-400 mt-3">
                Updated {formatDateTime(admission.updated_at)}
            </p>
        </div>
    );
}

export default function PatientDashboard() {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [admissions, setAdmissions] = useState([]);
    const [admissionsLoading, setAdmissionsLoading] = useState(true);
    const navigate = useNavigate();

    const user = authService.getCurrentUser();

    useEffect(() => {
        appointmentService
            .getPatientAppointments()
            .then(setAppointments)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        roomAdmissionService
            .getPatientAdmissions()
            .then(setAdmissions)
            .catch(() => {})
            .finally(() => setAdmissionsLoading(false));
    }, []);

    // Upcoming = pending or confirmed, sorted by date ascending
    const upcoming = appointments
        .filter((a) => ["pending", "confirmed"].includes(a.status))
        .sort(
            (a, b) =>
                new Date(a.appointment_date) - new Date(b.appointment_date),
        )
        .slice(0, 3); // show max 2 on dashboard

    // History = completed appointments
    const history = appointments
        .filter((a) => a.status === "completed")
        .sort(
            (a, b) =>
                new Date(b.appointment_date) - new Date(a.appointment_date),
        )
        .slice(0, 3);

    const activeAdmissionStatuses = ["pending", "admitted", "transfer"];
    const activeAdmissions = admissions.filter((admission) =>
        activeAdmissionStatuses.includes(admission.status),
    );
    const admissionPreview =
        activeAdmissions.length > 0
            ? activeAdmissions.slice(0, 3)
            : admissions.slice(0, 3);

    return (
        <div className="min-h-screen bg-[#eff6ff] px-4 sm:px-8 lg:px-12 py-8">
            <div className="max-w-5xl mx-auto flex flex-col gap-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col sm:flex-row sm:items-end justify-between gap-2"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">
                            Welcome back, {user?.name?.split(" ")[0] ?? "there"}
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            How are you feeling today?
                        </p>
                    </div>
                    <span className="text-xs font-medium text-slate-600 bg-white/80 border border-slate-100 px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                        {TODAY}
                    </span>
                </motion.div>

                {/* Action Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                    <ActionCard
                        icon={CalendarPlus}
                        title="Book Appointment"
                        description="Schedule a new visit with a specialist."
                        label="Book Now"
                        onClick={() => navigate("/patient/book-appointment")}
                    />
                    <ActionCard
                        icon={CalendarCheck}
                        title="My Appointments"
                        description="Check and manage all your appointments."
                        label="View All"
                        onClick={() => navigate("/patient/appointments")}
                    />
                    <ActionCard
                        icon={Bot}
                        title="AI Health Assistant"
                        description="Describe symptoms and get guidance before booking."
                        label="Open Chat"
                        isAI
                        onClick={() => setIsChatOpen(true)}
                    />
                </motion.div>

                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.12 }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-slate-800">
                            Room Admission Updates
                        </h2>
                    </div>

                    {admissionsLoading ? (
                        <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            <span className="text-sm">
                                Loading admission details...
                            </span>
                        </div>
                    ) : admissionPreview.length === 0 ? (
                        <div className="bg-white/80 rounded-2xl border border-slate-100 p-6 text-center">
                            <p className="text-slate-400 text-sm">
                                No room admission record linked to your account.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeAdmissions.length === 0 && (
                                <p className="text-xs text-slate-500 px-1">
                                    You currently have no active room admission. Showing recent room history.
                                </p>
                            )}
                            {admissionPreview.map((admission) => (
                                <AdmissionCard
                                    key={admission.id}
                                    admission={admission}
                                />
                            ))}
                        </div>
                    )}
                </motion.section>

                {/* Upcoming Appointments */}
                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-slate-800">
                            Upcoming Appointments
                        </h2>
                        <button
                            onClick={() => navigate("/patient/appointments")}
                            className="text-xs font-semibold text-[#127fec] hover:underline"
                        >
                            View all
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            <span className="text-sm">
                                Loading appointments...
                            </span>
                        </div>
                    ) : upcoming.length === 0 ? (
                        <div className="bg-white/80 rounded-2xl border border-slate-100 p-8 text-center">
                            <p className="text-slate-400 text-sm">
                                No upcoming appointments.
                            </p>
                            <button
                                onClick={() =>
                                    navigate("/patient/book-appointment")
                                }
                                className="mt-3 text-xs font-semibold text-[#127fec] hover:underline"
                            >
                                Book one now →
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {upcoming.map((appt) => (
                                <AppointmentCard key={appt.id} appt={appt} />
                            ))}
                        </div>
                    )}
                </motion.section>

                {/* Recent History */}
                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.22 }}
                >
                    <h2 className="text-lg font-bold text-slate-800 mb-3">
                        Recent History
                    </h2>

                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm">Loading history...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="bg-white/80 rounded-2xl border border-slate-100 p-6 text-center">
                            <p className="text-slate-400 text-sm">
                                No completed appointments yet.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {history.map((item) => (
                                <motion.div
                                    key={item.id}
                                    whileHover={{
                                        backgroundColor: "rgba(255,255,255,1)",
                                        boxShadow:
                                            "0 4px 20px rgba(18,127,236,0.08)",
                                    }}
                                    className="flex items-center gap-4 bg-white/70 rounded-2xl px-5 py-4 my-1 border border-slate-100 transition-colors cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                        <Stethoscope
                                            size={18}
                                            className="text-[#127fec]"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">
                                            {item.doctor_name}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {item.specialization}&nbsp;·&nbsp;
                                            {item.type === "in_person"
                                                ? "In-Person"
                                                : "Online"}
                                        </p>
                                        {item.doctor_service_hours && (
                                            <p className="text-xs text-slate-400 truncate mt-1">
                                                Service hours: {item.doctor_service_hours}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0 text-right">
                                        <span className="text-xs text-slate-400 hidden sm:block">
                                            {formatDate(item.appointment_date)}
                                        </span>
                                        <button
                                            onClick={() =>
                                                navigate(
                                                    `/patient/prescription/${item.id}`,
                                                )
                                            }
                                            className="text-xs font-semibold text-[#127fec] hover:underline focus:outline-none whitespace-nowrap"
                                            title="View Prescription"
                                        >
                                            View Prescription →
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                            <div className="text-center mt-2">
                                <button
                                    onClick={() => navigate("/patient/appointments", { state: { filter: "completed" } })}
                                    className="text-xs font-semibold text-[#127fec] hover:underline"
                                >
                                    View full history →
                                </button>
                            </div>
                        </div>
                    )}
                </motion.section>

                <AnimatePresence>
                    {isChatOpen && (
                        <>
                            <motion.div
                                key="backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsChatOpen(false)}
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                            />
                            <AIChatPanel
                                key="chat"
                                onClose={() => setIsChatOpen(false)}
                            />
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating Chat Button */}
            <motion.button
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setIsChatOpen(true)}
                className="ai-float-glow fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white focus:outline-none"
                style={{
                    background:
                        "linear-gradient(135deg, #a855f7, #3b82f6, #06b6d4)",
                }}
                title="Open AI Health Assistant"
            >
                <Bot size={24} />
            </motion.button>
        </div>
    );
}
