import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, AlarmClock, MapPin, Loader2, Video, X, FileText } from "lucide-react";
import appointmentService from "../../api/appointmentService";

const Motion = motion;

const STATUS_STYLES = {
    pending:   "bg-amber-50 text-amber-600 border border-amber-100",
    confirmed: "bg-blue-50 text-blue-600 border border-blue-100",
    in_progress: "bg-blue-50 text-blue-600 border border-blue-100",
    completed: "bg-green-50 text-green-600 border border-green-100",
    cancelled: "bg-red-50 text-red-400 border border-red-100",
};

function AppointmentCard({ appt, onCancel, cancelling , navigate, highlight }) {
    const isHighlighted = highlight == appt.id;
    const statusCls = STATUS_STYLES[appt.status] || STATUS_STYLES.pending;
    const accentColor =
        appt.status === "pending"    ? "linear-gradient(180deg, #f59e0b, #fbbf24)" :
        ["confirmed", "in_progress"].includes(appt.status) ? "linear-gradient(180deg, #0a5bbf, #127fec)" :
        appt.status === "completed"  ? "linear-gradient(180deg, #16a34a, #22c55e)" :
                                       "linear-gradient(180deg, #f87171, #ef4444)";

    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
    });

    const formatTime = (timeStr) => {
        if (!timeStr) return "—";
        const [h, m] = timeStr.split(":");
        const hour = parseInt(h);
        return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className={`bg-white/90 rounded-2xl shadow-sm overflow-hidden ${isHighlighted ? 'border-2 border-[#127fec] ring-4 ring-[#127fec]/20' : 'border border-slate-100'}`}
        >
            <div className="flex">
                <div className="w-1 flex-shrink-0" style={{ background: accentColor }} />
                <div className="flex-1 p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide capitalize ${statusCls}`}>
                            {appt.status}
                        </span>
                        <span className="text-slate-400 text-xs capitalize">
                            {appt.type === "in_person" ? "In-Person" : "Online"}
                        </span>
                    </div>

                    <p className="text-xl font-bold text-slate-800">{appt.doctor_name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{appt.specialization}</p>

                    <div className="flex flex-wrap gap-2 mt-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            <CalendarDays size={13} className="text-[#127fec]" />
                            {formatDate(appt.appointment_date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            <AlarmClock size={13} className="text-[#127fec]" />
                            {formatTime(appt.appointment_time)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            {appt.type === "online"
                                ? <><Video size={13} className="text-[#127fec]" /> Online Consultation</>
                                : <><MapPin size={13} className="text-[#127fec]" /> In-Person Visit</>
                            }
                        </span>
                        {appt.doctor_service_hours && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                                <AlarmClock size={13} className="text-[#127fec]" />
                                Service {appt.doctor_service_hours}
                            </span>
                        )}
                    </div>

                    {appt.symptoms && (
                        <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <span className="font-semibold text-slate-600">Symptoms: </span>
                            {appt.symptoms}
                        </p>
                    )}

                    {["pending"].includes(appt.status) && (
                        
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onCancel(appt.id)}
                                disabled={cancelling === appt.id}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors focus:outline-none disabled:opacity-50"
                            >
                                {cancelling === appt.id
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <X size={13} />
                                }
                                Cancel
                            </motion.button>
                        </div>
                    )}
                     {appt.status === "in_progress" &&
                        appt.type === "online" && (
                            <div className="mt-4">
                                <button
                                    onClick={() =>
                                        navigate(
                                            `/patient/consultation/${appt.id}`
                                        )
                                    }
                                    className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20"
                                >
                                    <Video size={14} className="inline mr-1" />
                                    Join Consultation
                                </button>
                            </div>
                        )}

                    {appt.status === "completed" && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <button
                                onClick={() =>
                                    navigate(`/patient/prescription/${appt.id}`)
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-[#127fec] border border-[#127fec]/40 hover:bg-blue-50 transition"
                            >
                                <FileText size={13} /> View Prescription
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default function PatientAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState("");
    const [cancelling, setCancelling]     = useState(null);
    const [page, setPage]                 = useState(1);
    const PER_PAGE = 5;
    const navigate = useNavigate();
    const location = useLocation();
    const highlightId = location.state?.highlight;
    const defaultFilter = location.state?.filter || "all";
    const [filter, setFilter]             = useState(defaultFilter);

    useEffect(() => {
        if (appointments.length > 0 && highlightId) {
            const index = appointments.findIndex(a => a.id == highlightId);
            if (index !== -1) {
                setFilter("all");
                setPage(Math.ceil((index + 1) / PER_PAGE));
            }
        }
    }, [appointments, highlightId]);

    useEffect(() => {
        if (location.state?.filter) {
            setFilter(location.state.filter);
        }
    }, [location.state]);

    useEffect(() => {
        appointmentService.getPatientAppointments()
            .then(setAppointments)
            .catch(() => setError("Failed to load appointments."))
            .finally(() => setLoading(false));
    }, []);

    const handleCancel = async (id) => {
        setCancelling(id);
        try {
            await appointmentService.cancelAppointment(id);
            setAppointments(prev =>
                prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a)
            );
        } catch {
            setError("Failed to cancel appointment.");
        } finally {
            setCancelling(null);
        }
    };

    const filtered = filter === "all"
        ? appointments
        : appointments.filter(a => a.status === filter);

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <div className="min-h-screen bg-[#eff6ff] px-4 sm:px-8 lg:px-12 py-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-slate-800">My Appointments</h1>
                    <p className="text-slate-500 text-sm mt-1">Track and manage your scheduled visits.</p>
                </motion.div>

                {/* Filter tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {["all", "pending", "confirmed", "completed", "cancelled"].map(f => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f); setPage(1); }}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border ${
                                filter === f
                                    ? "bg-[#127fec] text-white border-[#127fec] shadow-md"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-[#127fec] hover:text-[#127fec]"
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-sm">Loading appointments...</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 text-red-400 text-sm">{error}</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-sm">
                        No {filter === "all" ? "" : filter} appointments found.
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <AnimatePresence mode="popLayout">
                            {paginated.map(appt => (
                                <AppointmentCard
                                    key={appt.id}
                                    appt={appt}
                                    onCancel={handleCancel}
                                    cancelling={cancelling}
                                    navigate={navigate}
                                    highlight={highlightId}
                                />
                            ))}
                        </AnimatePresence>

                        {/* Pagination UI */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
                                <p className="text-sm text-slate-500 font-medium">
                                    Showing <span className="text-slate-800">{ (page - 1) * PER_PAGE + 1 }</span>–
                                    <span className="text-slate-800">{ Math.min(page * PER_PAGE, filtered.length) }</span> of 
                                    <span className="text-slate-800"> { filtered.length }</span>
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-1 mx-2">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setPage(i + 1)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                                    page === i + 1
                                                        ? "bg-[#127fec] text-white shadow-sm"
                                                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                }`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
