import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    CalendarDays,
    Users,
    UserCheck,
    Stethoscope,
    Loader2,
} from "lucide-react";
import adminService from "../../api/adminService";
import authService from "../../api/authService";
import { useNavigate } from "react-router-dom";

const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" },
    }),
};

const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-600",
    confirmed: "bg-blue-100 text-blue-600",
    completed: "bg-green-100 text-green-600",
    cancelled: "bg-red-100 text-red-600",
};

function formatDate(dateStr, timeStr) {
    const date = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
    if (!timeStr) return date;
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h);
    const formatted = `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    return `${date}, ${formatted}`;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const PER_PAGE = 5;

    const user = authService.getCurrentUser();
    const isSuperAdmin = user?.admin_role === "Super Admin";

    useEffect(() => {
        const apptFetcher = isSuperAdmin
            ? adminService.getAllAppointments
            : adminService.getDepartmentAppointments;

        Promise.all([
            adminService.getStats(),
            apptFetcher(),
        ])
            .then(([statsData, apptData]) => {
                setStats(statsData);
                setAppointments(apptData);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isSuperAdmin]);

    const totalPages = Math.ceil(appointments.length / PER_PAGE);
    // const paginated = appointments.slice(
    //     (page - 1) * PER_PAGE,
    //     page * PER_PAGE,
    // );
    //const recentAppointments = appointments.slice(0, 5);
    const recentAppointments = [...appointments]
    .sort((a, b) => {
        // Priority to pending status
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;

        // Secondary sort by date & time (most recent first)
        const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
        const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
        return dateB - dateA;
    })
    .slice(0, 5);

    const statCards = [
        {
            title: "Appointments Today",
            value: stats?.appointments_today ?? "—",
            icon: <CalendarDays size={28} />,
            color: "text-blue-500",
        },
        {
            title: "Upcoming",
            value: stats?.upcoming_appointments ?? "—",
            icon: <UserCheck size={28} />,
            color: "text-purple-500",
        },
        {
            title: "Total Doctors",
            value: stats?.total_doctors ?? "—",
            icon: <Stethoscope size={28} />,
            color: "text-orange-500",
        },
        {
            title: "Total Patients",
            value: stats?.total_patients ?? "—",
            icon: <Users size={28} />,
            color: "text-green-500",
        },
    ];

    return (
        <div className="min-h-screen bg-[#eff6ff] px-4 sm:px-8 lg:px-12 py-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-10"
            >
                <h1 className="text-3xl font-bold text-gray-800">
                    Admin Dashboard
                </h1>
                <p className="text-gray-500 mt-2">
                    Welcome back, {user?.name ?? "Admin"} — overview of hospital
                    operations.
                </p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.05 }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                    >
                        <div
                            className={`w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100 mb-4 ${stat.color}`}
                        >
                            {stat.icon}
                        </div>
                        <h2 className="text-sm text-gray-500">{stat.title}</h2>
                        <p className="text-2xl font-bold text-gray-800 mt-1">
                            {loading ? (
                                <Loader2
                                    size={20}
                                    className="animate-spin text-slate-300"
                                />
                            ) : (
                                stat.value
                            )}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Appointments Table */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl shadow-md border border-gray-100 p-8"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Recent Appointments
                    </h2>
                </div>
                <div className="flex justify-end mt-4">
    <button
        onClick={() => navigate("/admin/all-appointments")}
        className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
    >
        View All
    </button>
</div>

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-sm">Loading appointments...</span>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                        No appointments found.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="text-left py-3 px-2">
                                            Patient
                                        </th>
                                        <th className="text-left py-3 px-2">
                                            Doctor
                                        </th>
                                        <th className="text-left py-3 px-2">
                                            Department
                                        </th>
                                        <th className="text-left py-3 px-2">
                                            Date & Time
                                        </th>
                                        <th className="text-left py-3 px-2">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentAppointments.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="border-b last:border-none hover:bg-gray-50 transition"
                                        >
                                            <td className="py-4 px-2 font-medium text-gray-700">
                                                {item.patient_name}
                                            </td>
                                            <td className="py-4 px-2">
                                                {item.doctor_name}
                                            </td>
                                            <td className="py-4 px-2">
                                                {item.specialization}
                                            </td>
                                            <td className="py-4 px-2">
                                                {formatDate(
                                                    item.appointment_date,
                                                    item.appointment_time,
                                                )}
                                            </td>
                                            <td className="py-4 px-2">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                                        STATUS_COLORS[
                                                            item.status
                                                        ] ||
                                                        "bg-gray-100 text-gray-600"
                                                    }`}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {/* <div className="flex justify-between items-center mt-6">
                            <p className="text-sm text-gray-500">
                                Showing{" "}
                                {Math.min(
                                    (page - 1) * PER_PAGE + 1,
                                    appointments.length,
                                )}
                                –
                                {Math.min(page * PER_PAGE, appointments.length)}{" "}
                                of {appointments.length} appointments
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Prev
                                </button>
                                <span className="text-sm text-slate-600 font-medium">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div> */}
                    </>
                )}
            </motion.div>
        </div>
    );
}