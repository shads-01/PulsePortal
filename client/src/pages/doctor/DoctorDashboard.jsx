import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, Plus, TrendingUp, Loader2 } from "lucide-react";
import appointmentService from "../../api/appointmentService";
import authService from "../../api/authService";

const cardVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
    }),
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

export default function DoctorDashboard() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);

    const user = authService.getCurrentUser();

    useEffect(() => {
        appointmentService
            .getDoctorAppointments()
            .then(setAppointments)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleStatusUpdate = async (id, status) => {
        setUpdating(id);
        try {
            await appointmentService.updateAppointmentStatus(id, status);
            setAppointments((prev) =>
                prev.map((a) => (a.id === id ? { ...a, status } : a)),
            );
        } catch {
        } finally {
            setUpdating(null);
        }
    };

    // Fix: use local date not UTC
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const todayAppts = appointments.filter(
        (a) => String(a.appointment_date).slice(0, 10) === todayStr,
    );
    const upcomingCount = appointments.filter(
        (a) => !["cancelled", "completed"].includes(a.status),
    ).length;

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
                    <div className="grid md:grid-cols-2 gap-6">
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
                            <button className="text-[#127fec] text-sm font-medium hover:underline">
                                View Calendar
                            </button>
                        </div>

                        {/* Header Row */}
                        <div className="grid grid-cols-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-3 mb-4">
                            <div>Time</div>
                            <div>Patient Name</div>
                            <div>Type</div>
                            <div>Status</div>
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
                                <div className="text-center py-8 text-sm text-slate-400">
                                    No appointments today.
                                </div>
                            ) : (
                                todayAppts.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{
                                            backgroundColor: "#f8fafc",
                                        }}
                                        className="grid grid-cols-4 items-center p-4 rounded-xl border border-slate-100 transition"
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

                                            {/* Quick action buttons */}
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
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ scale: 1.02 }}
                        className="rounded-2xl p-6 text-white shadow-lg"
                        style={{
                            background:
                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                        }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <p className="font-medium">Weekly Efficiency</p>
                            <TrendingUp size={20} />
                        </div>
                        <h2 className="text-4xl font-bold">94%</h2>
                        <p className="text-sm opacity-90 mt-2">
                            You are in the top 5% of efficiency this week.
                        </p>
                    </motion.div>

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
        </div>
    );
}
