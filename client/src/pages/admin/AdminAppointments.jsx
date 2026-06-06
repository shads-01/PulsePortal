import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import adminService from "../../api/adminService";
import authService from "../../api/authService";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_COLORS = {
    pending:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
    confirmed: "bg-blue-100   text-blue-700   border border-blue-200",
    completed: "bg-green-100  text-green-700  border border-green-200",
    cancelled: "bg-red-100    text-red-700    border border-red-200",
};

const FILTERS = ["all", "pending", "confirmed", "cancelled", "completed"];

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    });
}

export default function AdminAppointments() {
    const [appointments, setAppointments]   = useState([]);
    const [loading, setLoading]             = useState(true);
    const [filter, setFilter]               = useState("all");
    const [updatingId, setUpdatingId]       = useState(null);
    const [page, setPage]                   = useState(1);
    const PER_PAGE = 8;
    const location = useLocation();
    const highlightId = location.state?.highlight;

    const currentUser  = authService.getCurrentUser();

    useEffect(() => {
        if (appointments.length > 0 && highlightId) {
            const sorted = [...appointments].sort((a, b) => {
                if (a.status === "pending" && b.status !== "pending") return -1;
                if (a.status !== "pending" && b.status === "pending") return 1;
                const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
                const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
                return dateB - dateA;
            });
            const index = sorted.findIndex(a => a.id == highlightId);
            if (index !== -1) {
                setFilter("all");
                setPage(Math.ceil((index + 1) / PER_PAGE));
            }
        }
    }, [appointments, highlightId]);
    const isSuperAdmin = currentUser?.admin_role === "Super Admin";
    const department   = currentUser?.department;

    useEffect(() => {
        const fetcher = isSuperAdmin
            ? adminService.getAllAppointments
            : adminService.getDepartmentAppointments;

        fetcher()
            .then((data) => setAppointments(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [isSuperAdmin]);

    const filtered = (filter === "all"
        ? appointments
        : appointments.filter((a) => a.status === filter)
    ).sort((a, b) => {
        // Priority to pending status
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;

        // Secondary sort by date & time (most recent first)
        const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
        const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
        return dateB - dateA;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const handleStatusUpdate = async (id, status) => {
        setUpdatingId(id);
        try {
            const updated = await adminService.updateAppointmentStatus(id, status);
            setAppointments((prev) =>
                prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a))
            );
        } catch (err) {
            console.error("Status update failed:", err);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#eff6ff] px-4 sm:px-8 lg:px-12 py-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">
                    {isSuperAdmin ? "All Appointments" : `${department || "Department"} Appointments`}
                </h1>
                <p className="text-gray-500 mt-1">
                    {isSuperAdmin
                        ? "Full hospital system overview"
                        : "Manage and approve appointment requests for your department"}
                </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {FILTERS.map((f) => (
                    <motion.button
                        key={f}
                        onClick={() => { setFilter(f); setPage(1); }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize
                            ${filter === f
                                ? "bg-[#127fec] text-white border-[#127fec] shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-[#127fec]/50"
                            }`}
                    >
                        {f}
                        {f !== "all" && (
                            <span className="ml-1 text-xs opacity-70">
                                ({appointments.filter((a) => a.status === f).length})
                            </span>
                        )}
                    </motion.button>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Loading appointments...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-sm">
                        No {filter !== "all" ? filter : ""} appointments found.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider border-b">
                                    <tr>
                                        <th className="text-left py-3 px-4">Patient</th>
                                        <th className="text-left py-3 px-4">Doctor</th>
                                        <th className="text-left py-3 px-4">Department</th>
                                        <th className="text-left py-3 px-4">Date & Time</th>
                                        <th className="text-left py-3 px-4">Type</th>
                                        <th className="text-left py-3 px-4">Status</th>
                                        {!isSuperAdmin && (
                                            <th className="text-left py-3 px-4">Actions</th>
                                        )}
                                    </tr>
                                </thead>

                                <tbody>
                                    <AnimatePresence>
                                        {paginated.map((a) => (
                                            <motion.tr
                                                key={a.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className={`border-b last:border-none transition ${highlightId == a.id ? 'bg-blue-50 ring-2 ring-[#127fec]/30' : 'hover:bg-gray-50'}`}
                                            >
                                                <td className="py-4 px-4 font-medium text-gray-700">
                                                    {a.patient_name}
                                                </td>
                                                <td className="py-4 px-4 text-gray-600">
                                                    <div>{a.doctor_name}</div>
                                                    <div className="text-xs text-gray-400">{a.specialization}</div>
                                                </td>
                                                <td className="py-4 px-4 text-gray-500 text-xs">
                                                    {a.department || "—"}
                                                </td>
                                                <td className="py-4 px-4 text-gray-600">
                                                    <div>{formatDate(a.appointment_date)}</div>
                                                    <div className="text-xs text-gray-400">{a.appointment_time}</div>
                                                </td>
                                                <td className="py-4 px-4 capitalize text-gray-600">
                                                    {a.type?.replace("_", " ")}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600"}`}>
                                                        {a.status}
                                                    </span>
                                                </td>

                                                {/* Action buttons — only for department admins */}
                                                {!isSuperAdmin && (
                                                    <td className="py-4 px-4">
                                                        {a.status === "pending" ? (
                                                            <div className="flex items-center gap-2">
                                                                <motion.button
                                                                    onClick={() => handleStatusUpdate(a.id, "confirmed")}
                                                                    disabled={updatingId === a.id}
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition"
                                                                >
                                                                    {updatingId === a.id ? (
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle size={12} />
                                                                    )}
                                                                    Confirm
                                                                </motion.button>
                                                                <motion.button
                                                                    onClick={() => handleStatusUpdate(a.id, "cancelled")}
                                                                    disabled={updatingId === a.id}
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-medium hover:bg-red-200 disabled:opacity-50 transition"
                                                                >
                                                                    <XCircle size={12} />
                                                                    Cancel
                                                                </motion.button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                <Clock size={12} />
                                                                {a.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-between items-center px-4 py-4 border-t">
                            <p className="text-sm text-gray-500">
                                Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >Prev</button>
                                <span className="text-sm text-slate-600 font-medium">{page} / {totalPages || 1}</span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || totalPages === 0}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >Next</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}