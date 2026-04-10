import React, { useEffect, useState } from "react";
import appointmentService from "../../api/appointmentService";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function DoctorAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        appointmentService
            .getDoctorAppointments()
            .then(setAppointments)
            .finally(() => setLoading(false));
    }, []);

    // Reset page when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [appointments]);

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

    return (
        <div className="min-h-screen bg-[#eff6ff] p-6">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-md border border-slate-100 p-6"
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">
                        All Appointments
                    </h2>

                    <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold">
                        {appointments.length} Total
                    </span>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-4 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 pb-3 mb-4">
                    <div>Date & Time</div>
                    <div>Patient</div>
                    <div>Type</div>
                    <div>Status</div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            <span className="text-sm">
                                Loading appointments...
                            </span>
                        </div>
                    ) : paginatedData.length === 0 ? (
                        <div className="text-center py-10 text-sm text-slate-400">
                            No appointments found.
                        </div>
                    ) : (
                        paginatedData.map((item) => (
                            <motion.div
                                key={item.id}
                                whileHover={{
                                    scale: 1.01,
                                    backgroundColor: "#f8fafc",
                                }}
                                className="grid grid-cols-4 items-center p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition"
                            >
                                {/* Date */}
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm">
                                        {new Date(
                                            item.appointment_date +
                                                "T00:00:00"
                                        ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {formatTime(
                                            item.appointment_time
                                        )}
                                    </p>
                                </div>

                                {/* Patient */}
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center text-sm font-semibold">
                                        {item.patient_name?.charAt(0)}
                                    </div>
                                    <span className="text-slate-700 font-medium text-sm">
                                        {item.patient_name}
                                    </span>
                                </div>

                                {/* Type */}
                                <div>
                                    <span
                                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                                            item.type === "in_person"
                                                ? "bg-indigo-50 text-indigo-600"
                                                : "bg-purple-50 text-purple-600"
                                        }`}
                                    >
                                        {item.type === "in_person"
                                            ? "In-Person"
                                            : "Online"}
                                    </span>
                                </div>

                                {/* Status */}
                                <div>
                                    <span
                                        className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${
                                            item.status === "confirmed"
                                                ? "bg-blue-100 text-blue-600"
                                                : item.status === "completed"
                                                ? "bg-green-100 text-green-600"
                                                : item.status === "cancelled"
                                                ? "bg-red-100 text-red-400"
                                                : "bg-yellow-100 text-yellow-600"
                                        }`}
                                    >
                                        {item.status}
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex justify-center mt-8 gap-2 flex-wrap">
                        <button
                            onClick={() =>
                                setCurrentPage((p) =>
                                    Math.max(p - 1, 1)
                                )
                            }
                            disabled={currentPage === 1}
                            className="px-4 py-1 rounded-full border text-sm disabled:opacity-50 hover:bg-slate-100"
                        >
                            Prev
                        </button>

                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() =>
                                    setCurrentPage(i + 1)
                                }
                                className={`px-3 py-1 rounded-full text-sm ${
                                    currentPage === i + 1
                                        ? "bg-blue-500 text-white"
                                        : "border hover:bg-slate-100"
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}

                        <button
                            onClick={() =>
                                setCurrentPage((p) =>
                                    Math.min(p + 1, totalPages)
                                )
                            }
                            disabled={currentPage === totalPages}
                            className="px-4 py-1 rounded-full border text-sm disabled:opacity-50 hover:bg-slate-100"
                        >
                            Next
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}