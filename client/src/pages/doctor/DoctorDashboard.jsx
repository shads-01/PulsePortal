import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    Users,
    Plus,
    TrendingUp,
    Loader2,
    FileText,
    User,
    X,
    Droplet,
    Activity,
    Phone,
    AlertTriangle,
    Sparkles,
    BedDouble,
    Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import appointmentService from "../../api/appointmentService";
import authService from "../../api/authService";
import api from "../../api/axios";
import roomAdmissionService from "../../api/roomAdmissionService";

const Motion = motion;

const cardVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
    }),
};

const ADMISSION_STATUS_STYLES = {
    pending: "bg-amber-50 text-amber-700 border border-amber-100",
    admitted: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    transfer: "bg-sky-50 text-sky-700 border border-sky-100",
    discharged: "bg-slate-100 text-slate-600 border border-slate-200",
    cancelled: "bg-rose-50 text-rose-600 border border-rose-100",
};

// Greeting based on time of day
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
}

function formatTime(t) {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function appointmentDateTime(appointment) {
    const datePart = String(appointment?.appointment_date || "").slice(0, 10);
    const timePart = appointment?.appointment_time || "00:00:00";

    const parsed = new Date(`${datePart}T${timePart}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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

export default function DoctorDashboard() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [admissions, setAdmissions] = useState([]);
    const [admissionsLoading, setAdmissionsLoading] = useState(true);
    const navigate = useNavigate();

    const user = authService.getCurrentUser();

    useEffect(() => {
        appointmentService
            .getDoctorAppointments()
            .then(setAppointments)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        roomAdmissionService
            .getDoctorAdmissions()
            .then(setAdmissions)
            .catch(() => {})
            .finally(() => setAdmissionsLoading(false));
    }, []);

    // Fix: use local date not UTC
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const todayAppts = appointments.filter(
        (a) => String(a.appointment_date).slice(0, 10) === todayStr,
    );
    const now = new Date();
    const upcomingAppointments = [...appointments]
        .filter((a) => !["cancelled", "completed"].includes(a.status))
        .filter((a) => {
            const dateTime = appointmentDateTime(a);
            return dateTime && dateTime >= now;
        })
        .sort((a, b) => appointmentDateTime(a) - appointmentDateTime(b));
    const upcomingCount = upcomingAppointments.length;
    const nextUpcomingAppointment = upcomingAppointments[0] || null;
    const upcomingPreview = upcomingAppointments.slice(0, 5);
    const activeAdmissions = admissions.filter((admission) =>
        ["pending", "admitted", "transfer"].includes(admission.status),
    );
    const admissionPreview =
        activeAdmissions.length > 0
            ? activeAdmissions.slice(0, 5)
            : admissions.slice(0, 5);

    // Pagination for Today's Appointments
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(todayAppts.length / itemsPerPage);
    const paginatedData = todayAppts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Patient Profile panel state
    const [profilePatient, setProfilePatient] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // AI Summary State
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryText, setSummaryText] = useState("");

    const handleViewProfile = async (patientId) => {
        setProfileLoading(true);
        setProfilePatient(null);
        setSummaryText(""); // Reset summary for new patient
        
        try {
            const res = await api.get(`/doctor/patient-profile/${patientId}`);
            setProfilePatient(res.data.data);
        } catch (e) {
            console.error(e);
            setProfilePatient({ error: "Could not load patient profile." });
        } finally {
            setProfileLoading(false);
        }
    };

    const handleGenerateSummary = () => {
        setSummaryLoading(true);
        
        // Dummy frontend logic for now
        setTimeout(() => {
             setSummaryText("Patient Clinical Summary:\n\n• Blood Pressure is slightly elevated based on previous visits.\n• The patient was recently prescribed Amoxicillin for a minor infection.\n• No known critical allergies.\n\nRecommendation: Check vitals to ensure blood pressure is stabilized.");
             setSummaryLoading(false);
        }, 1200);
    };

    const closeProfile = () => {
        setProfilePatient(null);
        setProfileLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#eff6ff] px-4 sm:px-8 lg:px-12 py-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-center mb-8"
            >
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        {getGreeting()}, {user?.name ?? "Doctor"}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        You have{" "}
                        <span className="text-[#0a5bbf] font-semibold">
                            {loading ? "—" : todayAppts.length} appointment
                            {todayAppts.length !== 1 ? "s" : ""}
                        </span>{" "}
                        scheduled for today.
                    </p>
                </div>

                {/* <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold shadow-md"
                    style={{
                        background: "linear-gradient(135deg, #127fec, #0a5bbf)",
                    }}
                >
                    <Plus size={18} />
                    New Appointment
                </motion.button> */}
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* LEFT SIDE */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                title: "Appointments Today",
                                value: loading ? "—" : todayAppts.length,
                                icon: <Calendar size={22} />,
                            },
                            {
                                title: "Upcoming",
                                value: loading ? "—" : upcomingCount,
                                icon: <Users size={22} />,
                            },
                            {
                                title: "Active Inpatients",
                                value: admissionsLoading ? "—" : activeAdmissions.length,
                                icon: <BedDouble size={22} />,
                            },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                variants={cardVariant}
                                initial="hidden"
                                animate="visible"
                                custom={i}
                                whileHover={{ y: -5 }}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <div className="p-3 bg-[#127fec]/10 text-[#0a5bbf] rounded-xl">
                                        {item.icon}
                                    </div>
                                </div>
                                <p className="text-slate-500 text-sm">
                                    {item.title}
                                </p>
                                <h2 className="text-3xl font-bold text-slate-800 mt-1">
                                    {item.value}
                                </h2>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22 }}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-slate-800">
                                Assigned Room Admissions
                            </h2>
                            {!admissionsLoading && (
                                <span className="text-xs text-slate-500">
                                    {admissions.length} total record
                                    {admissions.length === 1 ? "" : "s"}
                                </span>
                            )}
                        </div>

                        {admissionsLoading ? (
                            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-sm">Loading admissions...</span>
                            </div>
                        ) : admissionPreview.length === 0 ? (
                            <div className="text-center py-8 text-sm text-slate-400">
                                No room admission assigned to you yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeAdmissions.length === 0 && (
                                    <p className="text-xs text-slate-500 px-1">
                                        No active inpatient under your name. Showing recent records.
                                    </p>
                                )}

                                {admissionPreview.map((admission) => {
                                    const statusClass =
                                        ADMISSION_STATUS_STYLES[admission.status] ||
                                        ADMISSION_STATUS_STYLES.pending;

                                    return (
                                        <motion.div
                                            key={admission.id}
                                            whileHover={{ backgroundColor: "#f8fafc" }}
                                            className="border border-slate-100 rounded-xl p-4"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                <p className="font-semibold text-slate-700 text-sm">
                                                    {admission.patient_name}
                                                </p>
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide capitalize ${statusClass}`}
                                                >
                                                    {admission.status}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                                                    <Building2 size={12} className="text-[#127fec]" />
                                                    {admission.room_number || "Room pending"} · Bed {admission.bed_label || "—"}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                                                    {admission.admission_no}
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-500">
                                                {admission.department || "General"} · {admission.admission_type || "General"} · {admission.priority || "Normal"}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Updated {formatDateTime(admission.updated_at)}
                                            </p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>

                    {/* Schedule Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold text-slate-800">
                                Today's Schedule
                            </h2>
                        </div>

                        {/* Header Row */}
                        <div className="grid grid-cols-6 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-3 mb-4">
                            <div>Time</div>
                            <div>Patient Name</div>
                            <div>Type</div>
                            <div>Status</div>
                            <div>Prescription</div>
                            <div>Profile</div>
                        </div>

                        {/* Data Rows */}
                        <div className="space-y-3">
                            {loading ? (
                                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                    <span className="text-sm">
                                        Loading schedule...
                                    </span>
                                </div>
                            ) : todayAppts.length === 0 ? (
                                <div className="py-8 space-y-4">
                                    <div className="text-center text-sm text-slate-400 space-y-2">
                                        <p>No appointments today.</p>
                                        {nextUpcomingAppointment && (
                                            <p className="text-xs text-slate-500">
                                                Next booking: {nextUpcomingAppointment.patient_name} on {formatDate(nextUpcomingAppointment.appointment_date)} at {formatTime(nextUpcomingAppointment.appointment_time)}.
                                            </p>
                                        )}
                                    </div>

                                    {upcomingPreview.length > 0 && (
                                        <div className="max-w-2xl mx-auto rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                    Upcoming Appointments
                                                </p>
                                                <button
                                                    onClick={() => navigate("/doctor/appointments")}
                                                    className="text-xs font-semibold text-[#127fec] hover:underline"
                                                >
                                                    View all
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {upcomingPreview.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white border border-slate-100"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-slate-700 truncate">
                                                                {item.patient_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500 truncate">
                                                                {formatDate(item.appointment_date)} at {formatTime(item.appointment_time)} · {item.type === "in_person" ? "In-Person" : "Online"}
                                                            </p>
                                                        </div>
                                                        <span
                                                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize whitespace-nowrap ${
                                                                item.status === "confirmed"
                                                                    ? "bg-blue-100 text-blue-600"
                                                                    : item.status === "in_progress"
                                                                      ? "bg-violet-100 text-violet-600"
                                                                      : "bg-yellow-100 text-yellow-700"
                                                            }`}
                                                        >
                                                            {item.status === "in_progress" ? "In Progress" : item.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                paginatedData.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{
                                            backgroundColor: "#f8fafc",
                                        }}
                                        className="grid grid-cols-6 items-center p-4 rounded-xl border border-slate-100 transition"
                                    >
                                        <div className="font-medium text-slate-700">
                                            {formatTime(item.appointment_time)}
                                        </div>

                                        {/* Patient with Avatar */}
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center text-sm font-semibold">
                                                {item.patient_name?.charAt(0)}
                                            </div>
                                            <span className="text-slate-600 font-medium">
                                                {item.patient_name}
                                            </span>
                                        </div>

                                        <div className="text-slate-500 text-sm">
                                            {item.type === "in_person"
                                                ? "In-Person"
                                                : "Online"}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                                    item.status === "confirmed"
                                                        ? "bg-blue-100 text-blue-600"
                                                        : item.status ===
                                                            "completed"
                                                          ? "bg-green-100 text-green-600"
                                                          : item.status ===
                                                              "cancelled"
                                                            ? "bg-red-100 text-red-600"
                                                            : "bg-yellow-100 text-yellow-600"
                                                }`}
                                            >
                                                {item.status}
                                            </span>
                                        </div>

                                        {/* Prescription Upload */}
                                        <div>
                                            {item.has_prescription ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                                    ✓ Rx Done
                                                </span>
                                            ) : item.status === "confirmed" ? (
                                                <button
                                                    onClick={() =>
                                                        navigate(
                                                            `/doctor/prescription-preview/${item.id}`,
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#127fec] border border-[#127fec]/40 hover:bg-blue-50 transition"
                                                >
                                                    <FileText size={12} />{" "}
                                                    Upload Rx
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </div>

                                        {/* Patient Profile Button */}
                                        <div>
                                            <button
                                                onClick={() => handleViewProfile(item.patient_id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 transition"
                                            >
                                                <User size={12} /> Profile
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {!loading && totalPages > 1 && (
                            <div className="flex justify-center mt-6 gap-2 flex-wrap">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-1 rounded-full border text-sm disabled:opacity-50 hover:bg-slate-100"
                                >
                                    Prev
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`px-3 py-1 rounded-full text-sm ${
                                            currentPage === i + 1 ? "bg-blue-500 text-white" : "border hover:bg-slate-100"
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-1 rounded-full border text-sm disabled:opacity-50 hover:bg-slate-100"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* All Upcoming Appointments */}
                    {/* <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
                    >
                        <h2 className="text-lg font-semibold text-slate-800 mb-6">
                            All Appointments
                        </h2>

                        <div className="grid grid-cols-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-3 mb-4">
                            <div>Date</div>
                            <div>Patient</div>
                            <div>Type</div>
                            <div>Status</div>
                        </div>

                        <div className="space-y-3">
                            {loading ? (
                                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                    <span className="text-sm">Loading...</span>
                                </div>
                            ) : appointments.length === 0 ? (
                                <div className="text-center py-8 text-sm text-slate-400">
                                    No appointments yet.
                                </div>
                            ) : (
                                appointments.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{
                                            backgroundColor: "#f8fafc",
                                        }}
                                        className="grid grid-cols-4 items-center p-4 rounded-xl border border-slate-100 transition"
                                    >
                                        <div className="font-medium text-slate-700 text-sm">
                                            {new Date(
                                                item.appointment_date +
                                                    "T00:00:00",
                                            ).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                            <div className="text-xs text-slate-400">
                                                {formatTime(
                                                    item.appointment_time,
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center text-xs font-semibold">
                                                {item.patient_name?.charAt(0)}
                                            </div>
                                            <span className="text-slate-600 font-medium text-sm">
                                                {item.patient_name}
                                            </span>
                                        </div>

                                        <div className="text-slate-500 text-sm">
                                            {item.type === "in_person"
                                                ? "In-Person"
                                                : "Online"}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${
                                                    item.status === "confirmed"
                                                        ? "bg-blue-100 text-blue-600"
                                                        : item.status ===
                                                            "completed"
                                                          ? "bg-green-100 text-green-600"
                                                          : item.status ===
                                                              "cancelled"
                                                            ? "bg-red-100 text-red-400"
                                                            : "bg-yellow-100 text-yellow-600"
                                                }`}
                                            >
                                                {item.status}
                                            </span>
                                            {item.status === "pending" && (
                                                <button
                                                    onClick={() =>
                                                        handleStatusUpdate(
                                                            item.id,
                                                            "confirmed",
                                                        )
                                                    }
                                                    disabled={
                                                        updating === item.id
                                                    }
                                                    className="text-xs px-2 py-1 rounded-full bg-blue-500 text-white font-medium hover:bg-blue-600 transition disabled:opacity-50"
                                                >
                                                    {updating === item.id
                                                        ? "..."
                                                        : "Confirm"}
                                                </button>
                                            )}
                                            {item.status === "confirmed" && (
                                                <button
                                                    onClick={() =>
                                                        handleStatusUpdate(
                                                            item.id,
                                                            "completed",
                                                        )
                                                    }
                                                    disabled={
                                                        updating === item.id
                                                    }
                                                    className="text-xs px-2 py-1 rounded-full bg-green-500 text-white font-medium hover:bg-green-600 transition disabled:opacity-50"
                                                >
                                                    {updating === item.id
                                                        ? "..."
                                                        : "Complete"}
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div> */}
                </div>

                {/* RIGHT SIDE */}
                <div className="space-y-6">

                    {/* Appointment breakdown by status */}
                    {/* {!loading && appointments.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
                        >
                            <h3 className="text-sm font-semibold text-slate-700 mb-4">
                                Appointment Breakdown
                            </h3>
                            <div className="space-y-3">
                                {[
                                    {
                                        label: "Pending",
                                        status: "pending",
                                        color: "bg-yellow-400",
                                    },
                                    {
                                        label: "Confirmed",
                                        status: "confirmed",
                                        color: "bg-blue-500",
                                    },
                                    {
                                        label: "Completed",
                                        status: "completed",
                                        color: "bg-green-500",
                                    },
                                    {
                                        label: "Cancelled",
                                        status: "cancelled",
                                        color: "bg-red-400",
                                    },
                                ].map(({ label, status, color }) => {
                                    const count = appointments.filter(
                                        (a) => a.status === status,
                                    ).length;
                                    const pct = Math.round(
                                        (count / appointments.length) * 100,
                                    );
                                    return (
                                        <div key={status}>
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>{label}</span>
                                                <span className="font-semibold text-slate-700">
                                                    {count}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{
                                                        width: `${pct}%`,
                                                    }}
                                                    transition={{
                                                        duration: 0.6,
                                                        ease: "easeOut",
                                                    }}
                                                    className={`h-1.5 rounded-full ${color}`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )} */}
                </div>
            </div>

            {/* ── Patient Profile Side Panel ── */}
            <AnimatePresence>
                {(profileLoading || profilePatient) && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeProfile}
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                        />

                        {/* Slide-in Panel */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 260 }}
                            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                        >
                            {/* Panel Header */}
                            <div
                                className="flex items-center justify-between px-6 py-5 border-b border-slate-100"
                                style={{ background: "linear-gradient(135deg, #0a5bbf, #127fec)" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                                        <User size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-base">Patient Profile</p>
                                        <p className="text-blue-100 text-xs">Medical History & Details</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeProfile}
                                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
                                >
                                    <X size={16} className="text-white" />
                                </button>
                            </div>

                            {/* Panel Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                {profileLoading ? (
                                    <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                                        <Loader2 size={20} className="animate-spin" />
                                        <span className="text-sm">Loading profile...</span>
                                    </div>
                                ) : profilePatient?.error ? (
                                    <div className="text-center py-20 text-slate-400 text-sm">
                                        {profilePatient.error}
                                    </div>
                                ) : (
                                    <>
                                        {/* Avatar + Name */}
                                        <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                                                {profilePatient?.name?.charAt(0) || "?"}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-lg">{profilePatient?.name}</p>
                                                <p className="text-slate-500 text-sm">{profilePatient?.email}</p>
                                            </div>
                                        </div>

                                        {/* Vital Stats */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                                                <Droplet size={18} className="text-red-400" />
                                                <div>
                                                    <p className="text-xs text-slate-500 font-medium">Blood Group</p>
                                                    <p className="font-bold text-slate-800">{profilePatient?.blood_group || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
                                                <Activity size={18} className="text-blue-400" />
                                                <div>
                                                    <p className="text-xs text-slate-500 font-medium">Date of Birth</p>
                                                    <p className="font-bold text-slate-800">{profilePatient?.dob || "—"}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact */}
                                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact</p>
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <Phone size={14} className="text-slate-400" />
                                                {profilePatient?.phone || "—"}
                                            </div>
                                            <p className="text-sm text-slate-600">{profilePatient?.address || "—"}</p>
                                            {profilePatient?.emergency_contact && (
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Emergency: {profilePatient.emergency_contact} ({profilePatient.emergency_phone})
                                                </p>
                                            )}
                                        </div>

                                        {/* Medical History */}
                                        {profilePatient?.medical_history && (
                                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertTriangle size={14} className="text-amber-500" />
                                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Medical History</p>
                                                </div>
                                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                    {profilePatient.medical_history}
                                                </p>
                                            </div>
                                        )}

                                        {/* Recent Appointments */}
                                        {profilePatient?.recent_appointments?.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Appointments</p>
                                                <div className="space-y-2">
                                                    {profilePatient.recent_appointments.map((appt, i) => (
                                                        <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-700">{appt.doctor_name}</p>
                                                                <p className="text-xs text-slate-400">{appt.appointment_date} · {appt.symptoms}</p>
                                                            </div>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                                appt.status === "completed" ? "bg-green-100 text-green-600"
                                                                : appt.status === "confirmed" ? "bg-blue-100 text-blue-600"
                                                                : "bg-slate-100 text-slate-500"
                                                            }`}>{appt.status}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* AI Clinical Summary (Frontend Mockup) */}
                                        <div className="border border-slate-200 rounded-2xl overflow-hidden mt-6 bg-white shadow-sm p-5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-[#127fec]">
                                                    <Sparkles size={16} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-sm">AI Patient Summary</h3>
                                                    <p className="text-xs text-slate-500">Generate a quick clinical overview</p>
                                                </div>
                                            </div>
                                            
                                            {!summaryText && !summaryLoading ? (
                                                <button 
                                                    onClick={handleGenerateSummary}
                                                    className="w-full py-2.5 bg-blue-50 text-[#127fec] font-semibold rounded-xl text-sm border border-blue-100 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Sparkles size={16} /> Generate Summary
                                                </button>
                                            ) : summaryLoading ? (
                                                <div className="flex items-center justify-center py-4 text-slate-500 text-sm gap-2 bg-slate-50 rounded-xl border border-slate-100">
                                                    <Loader2 size={16} className="animate-spin text-[#127fec]" />
                                                    Generating clinical summary...
                                                </div>
                                            ) : (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap shadow-inner"
                                                >
                                                    {summaryText}
                                                </motion.div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
