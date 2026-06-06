import React, { useEffect, useState } from "react";
import appointmentService from "../../api/appointmentService";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, FileText, CheckCircle, X, User, Activity, Phone, Droplet, AlertTriangle, MessageSquare, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import consultationService from "../../api/consultationService";
import aiService from "../../api/aiService";
import api from "../../api/axios";
import MarkdownRenderer from "../../components/MarkdownRenderer";

export default function DoctorAppointments() {
    const [appointments, setAppointments] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const highlightId = location.state?.highlight;
    const [loading, setLoading] = useState(true);
    const [startingId, setStartingId] = useState(null);

    // Patient Profile panel
    const [profilePatient, setProfilePatient] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // Summary State
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryText, setSummaryText] = useState("");

    // Today's date string (local)
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        appointmentService
            .getDoctorAppointments()
            .then((data) =>
                setAppointments(
                    data.map((item) => ({
                        ...item,
                        type: item.type?.trim()?.toLowerCase(),
                        status: item.status?.trim()?.toLowerCase(),
                    }))
                )
            )
            .finally(() => setLoading(false));
    }, []);

    // Handle highlight and pagination reset
    useEffect(() => {
        if (appointments.length === 0) return;

        if (highlightId) {
            const index = appointments.findIndex((a) => a.id == highlightId);
            if (index !== -1) {
                setCurrentPage(Math.ceil((index + 1) / itemsPerPage));
                return;
            }
        }
        setCurrentPage(1);
    }, [appointments, highlightId]);

    const totalPages = Math.ceil(appointments.length / itemsPerPage);

    const paginatedData = appointments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    function formatTime(t) {
        if (!t) return "—";
        const [h, m] = t.split(":");
        const hour = parseInt(h);
        return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${
            hour >= 12 ? "PM" : "AM"
        }`;
    }

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

    const handleGenerateSummary = async () => {
        if (!profilePatient?.id) return;
        setSummaryLoading(true);
        
        try {
            const summary = await aiService.getPatientSummary(profilePatient.id);
            setSummaryText(summary);
        } catch (err) {
            setSummaryText("⚠️ Failed to generate summary. " + (err?.response?.data?.message || "AI service may be temporarily unavailable. Please try again later."));
        } finally {
            setSummaryLoading(false);
        }
    };

    const closeProfile = () => {
        setProfilePatient(null);
        setProfileLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#eff6ff] p-6">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-md border border-slate-100 p-6"
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">All Appointments</h2>
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold">
                        {appointments.length} Total
                    </span>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-7 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 pb-3 mb-4">
                    <div>Date & Time</div>
                    <div>Patient</div>
                    <div>Type</div>
                    <div>Status</div>
                    <div>Consultation</div>
                    <div>Prescription</div>
                    <div>Profile</div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            <span className="text-sm">Loading appointments...</span>
                        </div>
                    ) : paginatedData.length === 0 ? (
                        <div className="text-center py-10 text-sm text-slate-400">
                            No appointments found.
                        </div>
                    ) : (
                        paginatedData.map((item) => (
                            <motion.div
                                key={item.id}
                                whileHover={{ scale: 1.01, backgroundColor: "#f8fafc" }}
                                className={`grid grid-cols-7 items-center p-4 rounded-xl shadow-sm hover:shadow-md transition ${
                                    highlightId == item.id
                                        ? "border-[#127fec] ring-2 ring-[#127fec]/20 bg-blue-50/50"
                                        : "border border-slate-100"
                                }`}
                            >
                                {/* Date */}
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm">
                                        {new Date(
                                            (item.appointment_date?.includes("T")
                                                ? item.appointment_date.split("T")[0]
                                                : item.appointment_date) + "T00:00:00"
                                        ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </p>
                                    <p className="text-xs text-slate-400">{formatTime(item.appointment_time)}</p>
                                </div>

                                {/* Patient */}
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center text-sm font-semibold">
                                        {item.patient_name?.charAt(0)}
                                    </div>
                                    <span className="text-slate-700 font-medium text-sm">{item.patient_name}</span>
                                </div>

                                {/* Type */}
                                <div>
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                        item.type === "in_person"
                                            ? "bg-indigo-50 text-indigo-600"
                                            : "bg-purple-50 text-purple-600"
                                    }`}>
                                        {item.type === "in_person" ? "In-Person" : "Online"}
                                    </span>
                                </div>

                                {/* Status */}
                                <div>
                                    <span className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${
                                        item.status === "confirmed"   ? "bg-blue-100 text-blue-600"
                                        : item.status === "completed"  ? "bg-green-100 text-green-600"
                                        : item.status === "in_progress"? "bg-violet-100 text-violet-600"
                                        : item.status === "cancelled"  ? "bg-red-100 text-red-400"
                                        : "bg-yellow-100 text-yellow-600"
                                    }`}>
                                        {item.status === "in_progress" ? "In Progress" : item.status}
                                    </span>
                                </div>

                                {/* Consultation Action */}
                                <div>
                                    {(item.status === "confirmed" || item.status === "in_progress") && item.type === "online" ? (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setStartingId(item.id);
                                                    const data = await consultationService.startConsultation(item.id);
                                                    navigate(`/doctor/consultation/${item.id}`, { state: { room_name: data.room_name } });
                                                } catch (e) {
                                                    alert("Failed to start consultation");
                                                } finally {
                                                    setStartingId(null);
                                                }
                                            }}
                                            disabled={startingId === item.id}
                                            className="px-4 py-1 rounded-full border text-sm font-semibold hover:bg-green-100 disabled:opacity-50"
                                        >
                                            {startingId === item.id ? "..." : item.status === "in_progress" ? "Join" : "Start"}
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-400">—</span>
                                    )}
                                </div>

                                {/* Prescription */}
                                <div>
                                    {(() => {
                                        const apptDate = String(item.appointment_date).slice(0, 10);
                                        const isToday = apptDate === todayStr;
                                        if (item.has_prescription) {
                                            return (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                                    <CheckCircle size={12} /> Rx Done
                                                </span>
                                            );
                                        }
                                        if (isToday && item.status === "confirmed") {
                                            return (
                                                <button
                                                    onClick={() => navigate(`/doctor/prescription-preview/${item.id}`)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#127fec] border border-[#127fec]/40 hover:bg-blue-50 transition"
                                                >
                                                    <FileText size={12} /> Upload Rx
                                                </button>
                                            );
                                        }
                                        return <span className="text-xs text-slate-400">—</span>;
                                    })()}
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
                    <div className="flex justify-center mt-8 gap-2 flex-wrap">
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
                                                    className="bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-inner"
                                                >
                                                    <MarkdownRenderer content={summaryText} />
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