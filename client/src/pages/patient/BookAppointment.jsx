import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import appointmentService from "../../api/appointmentService";
import aiService from "../../api/aiService";
import {
    Star,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Search,
    CalendarDays,
    Clock,
    UserCheck,
    ArrowRight,
    Video,
    MapPin,
    Loader2,
    X,
    Send,
} from "lucide-react";

const Motion = motion;

// Departments are now built dynamically from the doctors loaded from the API

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function to12HourLabel(timeValue) {
    if (!timeValue) return null;

    const [rawHour, rawMinute] = String(timeValue).split(":");
    const hour = Number(rawHour);
    const minute = Number(rawMinute);

    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatServiceHoursLabel(serviceHours) {
    if (!serviceHours || !serviceHours.start || !serviceHours.end) {
        return null;
    }

    const startLabel = to12HourLabel(serviceHours.start);
    const endLabel = to12HourLabel(serviceHours.end);

    if (!startLabel || !endLabel) {
        return null;
    }

    return `${startLabel} - ${endLabel}`;
}

function DoctorCard({ doctor, selected, onSelect }) {
    return (
        <motion.div
            layout
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={() => onSelect(doctor)}
            className={`relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border
                ${
                    selected
                        ? "border-[#127fec] shadow-lg shadow-blue-100/60 bg-white"
                        : "border-slate-100 bg-white/80 hover:border-slate-200 hover:bg-white"
                }`}
            style={
                selected
                    ? {
                          boxShadow: `0 0 0 2px #127fec40, 0 4px 20px rgba(18,127,236,0.12)`,
                      }
                    : {}
            }
        >
            {/* Avatar */}
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: doctor.color, color: doctor.accent }}
            >
                {doctor.avatar}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                    {doctor.name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                    {doctor.specialty} · {doctor.clinic}
                </p>
                <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-slate-400">
                        ৳{doctor.fee} fee
                    </span>
                </div>
                {doctor.serviceHoursLabel && (
                    <div className="flex items-center gap-1 mt-1">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-[11px] text-slate-500">
                            Service hours: {doctor.serviceHoursLabel}
                        </span>
                    </div>
                )}
            </div>

            {/* Select indicator */}
            <AnimatePresence>
                {selected ? (
                    <motion.div
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 20,
                        }}
                    >
                        <CheckCircle2
                            size={20}
                            className="text-[#127fec] flex-shrink-0"
                        />
                    </motion.div>
                ) : (
                    <motion.button
                        key="select"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs font-semibold text-[#127fec] border border-[#127fec] px-3 py-1 rounded-full hover:bg-[#127fec] hover:text-white transition-colors flex-shrink-0"
                    >
                        Select
                    </motion.button>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
    const d = new Date(year, month, 1).getDay();
    return (d + 6) % 7;
}
const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

function MiniCalendar({ selectedDate, onSelect, doctorAvailability = null }) {
    const today = new Date();
    const [view, setView] = useState({
        year: today.getFullYear(),
        month: today.getMonth(),
    });

    const daysInMonth = getDaysInMonth(view.year, view.month);
    const firstDay = getFirstDayOfWeek(view.year, view.month);

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const prevMonth = () =>
        setView((v) =>
            v.month === 0
                ? { year: v.year - 1, month: 11 }
                : { year: v.year, month: v.month - 1 },
        );
    const nextMonth = () =>
        setView((v) =>
            v.month === 11
                ? { year: v.year + 1, month: 0 }
                : { year: v.year, month: v.month + 1 },
        );

    const isAvailableToday = (d) => {
        if (!doctorAvailability) return true;
        const date = new Date(view.year, view.month, d);
        const dayName = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
            date.getDay()
        ];
        return !!doctorAvailability[dayName];
    };

    const isPast = (d) => {
        const cell = new Date(view.year, view.month, d);
        cell.setHours(0, 0, 0, 0);
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return cell < t;
    };

    const isSelected = (d) =>
        selectedDate &&
        selectedDate.year === view.year &&
        selectedDate.month === view.month &&
        selectedDate.day === d;

    const isToday = (d) =>
        today.getFullYear() === view.year &&
        today.getMonth() === view.month &&
        today.getDate() === d;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div
                    onClick={prevMonth}
                    className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                    <ChevronLeft size={18} className="text-slate-500" />
                </div>
                <p className="text-md font-bold text-slate-800">
                    {MONTH_NAMES[view.month]} {view.year}
                </p>
                <div
                    onClick={nextMonth}
                    className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                    <ChevronRight size={18} className="text-slate-500" />
                </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d) => (
                    <div
                        key={d}
                        className="text-center text-[13px] font-semibold text-slate-400 py-1"
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} />;
                    const past = isPast(day);
                    const docAvail = isAvailableToday(day);
                    const disabled = past || !docAvail;
                    const sel = isSelected(day);
                    const tod = isToday(day);

                    return (
                        <motion.button
                            key={day}
                            whileTap={!disabled ? { scale: 0.9 } : {}}
                            disabled={disabled}
                            onClick={() =>
                                !disabled &&
                                onSelect({
                                    year: view.year,
                                    month: view.month,
                                    day,
                                })
                            }
                            className={`w-8 h-8 mx-auto rounded-full text-sm font-medium transition-all flex items-center justify-center
                                ${disabled ? "text-slate-200 cursor-not-allowed" : "cursor-pointer hover:bg-blue-50 hover:text-[#127fec]"}
                                ${sel ? "!bg-[#127fec] !text-white shadow-md shadow-blue-200 font-bold" : ""}
                                ${tod && !sel ? "ring-1 ring-[#127fec] text-[#127fec] font-bold" : ""}
                                ${!disabled && !sel ? "text-slate-700" : ""}
                                ${!past && !docAvail ? "!text-slate-200" : ""}
                            `}
                            title={
                                !past && !docAvail ? "Doctor not available" : ""
                            }
                        >
                            {day}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
function TimeSlotGrid({ selectedTime, onSelect, slots = [], loading = false }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            {loading ? (
                <div className="text-center py-8 text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <p className="text-sm">Loading available slots...</p>
                </div>
            ) : slots.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-sm text-slate-400">
                        No slots available for this day.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {slots.map((slot, i) => {
                        const isSel = selectedTime === slot.time;
                        return (
                            <motion.button
                                key={i}
                                whileTap={slot.available ? { scale: 0.92 } : {}}
                                whileHover={
                                    slot.available && !isSel
                                        ? { scale: 1.03 }
                                        : {}
                                }
                                disabled={!slot.available}
                                onClick={() =>
                                    slot.available && onSelect(slot.time)
                                }
                                className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border
                                    ${
                                        !slot.available
                                            ? "border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed line-through"
                                            : isSel
                                              ? "border-[#127fec] text-white shadow-md shadow-blue-200"
                                              : "border-slate-200 text-slate-700 hover:border-[#127fec] hover:text-[#127fec] bg-white"
                                    }`}
                                style={
                                    isSel
                                        ? {
                                              background:
                                                  "linear-gradient(135deg, #0a5bbf, #127fec)",
                                          }
                                        : {}
                                }
                            >
                                {slot.time}
                            </motion.button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
function SummaryRow({ label, value, icon: Icon, done }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {label}
            </span>
            <div className="flex items-center gap-1.5">
                {Icon && (
                    <Icon
                        size={13}
                        className={done ? "text-[#127fec]" : "text-slate-300"}
                    />
                )}
                <AnimatePresence mode="wait">
                    <motion.span
                        key={value}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22 }}
                        className={`text-sm font-semibold ${done ? "text-slate-800" : "text-slate-300"}`}
                    >
                        {value}
                    </motion.span>
                </AnimatePresence>
            </div>
        </div>
    );
}
function formatDate(year, month, day) {
    return `${day} ${MONTH_NAMES[month]} ${year}`;
}


export default function BookAppointment() {
    const [search, setSearch] = useState("");
    const [dept, setDept] = useState("All");
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [confirmed, setConfirmed] = useState(false);
    const [symptoms, setSymptoms] = useState("");

    const [doctors, setDoctors] = useState([]);
    const [loadingDoctors, setLoadingDoctors] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const doctorsPerPage = 5;

    const [bookedSlots, setBookedSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // ── AI Doctor Suggestion State ──
    const [isAiSearchActive, setIsAiSearchActive] = useState(false);
    const [aiSearchQuery, setAiSearchQuery] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null); // { specializations, explanation }
    const [aiError, setAiError] = useState("");
    const searchInputRef = useRef(null);

    useEffect(() => {
        appointmentService
            .getDoctors()
            .then(setDoctors)
            .catch(() => setDoctors([]))
            .finally(() => setLoadingDoctors(false));
    }, []);

    useEffect(() => {
        if (selectedDate && selectedDoctor) {
            setLoadingSlots(true);
            const dateStr = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, "0")}-${String(selectedDate.day).padStart(2, "0")}`;
            appointmentService
                .getBookedSlots(selectedDoctor.id, dateStr)
                .then((slots) => setBookedSlots(slots || []))
                .catch(() => setBookedSlots([]))
                .finally(() => setLoadingSlots(false));
        } else {
            setBookedSlots([]);
        }
    }, [selectedDate, selectedDoctor]);

    const getDynamicSlots = () => {
        if (!selectedDoctor || !selectedDate) return [];
        const cell = new Date(
            selectedDate.year,
            selectedDate.month,
            selectedDate.day,
        );
        const dayMap = {
            0: "sun",
            1: "mon",
            2: "tue",
            3: "wed",
            4: "thu",
            5: "fri",
            6: "sat",
        };
        const dWeek = dayMap[cell.getDay()];

        const availability = selectedDoctor.availability?.[dWeek];
        if (!availability || availability.length !== 2) return [];
        
        let [startH, startM] = availability[0].split(':').map(Number);
        let [endH, endM] = availability[1].split(':').map(Number);
        
        // Check if selected date is today
        const now = new Date();
        const isToday = cell.getFullYear() === now.getFullYear()
            && cell.getMonth() === now.getMonth()
            && cell.getDate() === now.getDate();
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        
        const formatUI = (h, m) => {
            const period = h >= 12 ? "PM" : "AM";
            const hr = h % 12 || 12;
            return `${String(hr).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
        };
        const formatDB = (h, m) =>
            `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;

        const slots = [];
        let currH = startH;
        let currM = startM;
        while (currH < endH || (currH === endH && currM < endM)) {
            const dbTime = formatDB(currH, currM);
            const uiTime = formatUI(currH, currM);
            const isBooked = bookedSlots.includes(dbTime);
            const isPast = isToday && (currH < currentH || (currH === currentH && currM <= currentM));
            const available = !isBooked && !isPast;
            
            slots.push({ id: uiTime, time: uiTime, dbTime: dbTime, available });

            currM += 30;
            if (currM >= 60) {
                currH += 1;
                currM -= 60;
            }
        }
        return slots;
    };

    // Map API doctor to shape your DoctorCard expects
    const mappedDoctors = doctors.map((d, i) => {
        const COLORS = [
            { color: "#e0f2fe", accent: "#0284c7" },
            { color: "#ede9fe", accent: "#7c3aed" },
            { color: "#dcfce7", accent: "#16a34a" },
            { color: "#fff7ed", accent: "#ea580c" },
            { color: "#fce7f3", accent: "#db2777" },
        ];
        const c = COLORS[i % COLORS.length];
        const resolvedServiceHours =
            d.service_hours || d.availability?.service_hours || null;

        return {
            id: d.id,
            name: d.name,
            specialty: d.specialization,
            department: d.department || d.specialization,
            clinic: "PulsePortal Clinic",
            rating: 4.8,
            fee: d.fee ?? 50,
            avatar: d.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase(),
            color: c.color,
            accent: c.accent,
            availability: d.availability,
            serviceHours: resolvedServiceHours,
            serviceHoursLabel:
                d.service_hours_label ||
                formatServiceHoursLabel(resolvedServiceHours),
        };
    });

    const departmentsList = [
        "All",
        ...new Set(mappedDoctors.map((d) => d.department)),
    ];

    const filteredDoctors = mappedDoctors.filter((d) => {
        // If AI filter is active, only show doctors matching AI-suggested specializations
        if (aiResult && aiResult.specializations.length > 0) {
            const matchAi = aiResult.specializations.some(
                (spec) => d.specialty.toLowerCase() === spec.toLowerCase(),
            );
            if (!matchAi) return false;
        }

        const words = search
            .toLowerCase()
            .split(" ")
            .filter((w) => w.trim() !== "");
        const matchSearch =
            words.length === 0 ||
            words.every(
                (word) =>
                    d.name.toLowerCase().includes(word) ||
                    d.specialty.toLowerCase().includes(word),
            );
        const matchDept = dept === "All" || d.department === dept;
        return matchSearch && matchDept;
    });

    // ── AI Doctor Suggestion handlers ──
    useEffect(() => {
        setCurrentPage(1);
    }, [search, dept, aiResult]);

    const activateAiSearch = () => {
        setIsAiSearchActive(true);
        setAiResult(null);
        setAiError("");
        setAiSearchQuery("");
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    const cancelAiSearch = () => {
        setIsAiSearchActive(false);
        setAiSearchQuery("");
        setAiResult(null);
        setAiError("");
    };

    const handleAiSearch = async () => {
        const query = aiSearchQuery.trim();
        if (!query || aiLoading) return;
        setAiLoading(true);
        setAiError("");
        setAiResult(null);
        try {
            const result = await aiService.suggestDoctors(query);
            setAiResult(result);
            setIsAiSearchActive(false);
        } catch (err) {
            console.error("AI suggest error:", err);
            const backendMsg = err.response?.data?.message;
            setAiError(
                backendMsg ||
                    "AI service is temporarily unavailable. Please try again.",
            );
        } finally {
            setAiLoading(false);
        }
    };

    const canConfirm =
        selectedDoctor &&
        selectedType &&
        selectedDate &&
        selectedTime &&
        symptoms.trim();

    // ── Convert UI time "09:00 AM" → "09:00:00" for backend ──
    const convertTime = (timeStr) => {
        const [time, modifier] = timeStr.split(" ");
        let [hours, minutes] = time.split(":");
        if (modifier === "PM" && hours !== "12")
            hours = String(parseInt(hours) + 12);
        if (modifier === "AM" && hours === "12") hours = "00";
        return `${hours.padStart(2, "0")}:${minutes}:00`;
    };

    const handleConfirm = async () => {
        if (!canConfirm) return;
        setBookingLoading(true);
        setBookingError("");

        try {
            await appointmentService.bookAppointment({
                doctor_id: selectedDoctor.id,
                appointment_date: `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, "0")}-${String(selectedDate.day).padStart(2, "0")}`,
                appointment_time: convertTime(selectedTime),
                type: selectedType === "in-person" ? "in_person" : "online",
                symptoms: symptoms,
            });
            setConfirmed(true);
        } catch (err) {
            setBookingError(
                err.response?.data?.message ||
                    "Booking failed. Please try again.",
            );
        } finally {
            setBookingLoading(false);
        }
    };

    const dateLabel = selectedDate
        ? formatDate(selectedDate.year, selectedDate.month, selectedDate.day)
        : "Not selected";

    // ── Booking confirmation screen ──
    if (confirmed) {
        return (
            <div className="min-h-screen bg-[#eff6ff] flex items-center justify-center px-4">
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                            delay: 0.2,
                            type: "spring",
                            stiffness: 300,
                        }}
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                        style={{
                            background:
                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                        }}
                    >
                        <CheckCircle2 size={40} className="text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">
                        Booking Confirmed!
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Your appointment has been scheduled.
                    </p>

                    <div className="bg-blue-50 rounded-2xl p-5 text-left space-y-3 mb-7">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Doctor
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                                {selectedDoctor.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {selectedDoctor.specialty}
                            </p>
                        </div>
                        <div className="flex gap-8">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    Date
                                </p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {dateLabel}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    Time
                                </p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {selectedTime}
                                </p>
                            </div>
                        </div>
                        {selectedDoctor?.serviceHoursLabel && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    Service Hours
                                </p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {selectedDoctor.serviceHoursLabel}
                                </p>
                            </div>
                        )}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                            setConfirmed(false);
                            setSelectedDoctor(null);
                            setSelectedType(null);
                            setSelectedDate(null);
                            setSelectedTime(null);
                            setSymptoms("");
                        }}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg"
                        style={{
                            background:
                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                        }}
                    >
                        Book Another Appointment
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#eff6ff] px-3 sm:px-5 lg:px-8 py-5">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-8 pt-6"
                >
                    <h1 className="text-3xl font-bold text-slate-800">
                        Book Appointment
                    </h1>
                    <p className="text-slate-500 text-md mt-1">
                        Find the best care and schedule your visit in seconds.
                    </p>
                </motion.div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* LEFT panel */}
                    <div className="flex-1 flex flex-col gap-5 min-w-0">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.05 }}
                            className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm py-6 px-8"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-lg text-slate-800">
                                    Find a Doctor
                                </h2>
                                {!isAiSearchActive && !aiResult && (
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={activateAiSearch}
                                        className="ai-border-glow flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#127fec] bg-white rounded-2xl"
                                    >
                                        <Sparkles size={12} />
                                        Suggest best doctor by symptoms
                                    </motion.button>
                                )}
                                {aiResult && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={cancelAiSearch}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 rounded-2xl hover:bg-red-100 transition-colors"
                                    >
                                        <X size={12} />
                                        Clear AI filter
                                    </motion.button>
                                )}
                            </div>

                            {/* AI Result Banner */}
                            <AnimatePresence>
                                {aiResult && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-4 overflow-hidden"
                                    >
                                        <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/60">
                                            <div className="w-8 h-8 rounded-xl bg-[#127fec]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Sparkles
                                                    size={14}
                                                    className="text-[#127fec]"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-[#127fec] uppercase tracking-wider mb-1">
                                                    AI Recommendation
                                                </p>
                                                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                                                    {aiResult.explanation}
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {aiResult.specializations.map(
                                                        (spec) => (
                                                            <span
                                                                key={spec}
                                                                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#127fec]/10 text-[#127fec] border border-[#127fec]/20"
                                                            >
                                                                {spec}
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* AI Error */}
                            <AnimatePresence>
                                {aiError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs"
                                    >
                                        {aiError}
                                        <button
                                            onClick={() => setAiError("")}
                                            className="ml-auto text-red-400 hover:text-red-600"
                                        >
                                            <X size={12} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                                <div className="relative flex-1">
                                    {isAiSearchActive ? (
                                        <Sparkles
                                            size={14}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#127fec] animate-pulse"
                                        />
                                    ) : (
                                        <Search
                                            size={14}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        />
                                    )}
                                    <input
                                        ref={searchInputRef}
                                        value={
                                            isAiSearchActive
                                                ? aiSearchQuery
                                                : search
                                        }
                                        onChange={(e) =>
                                            isAiSearchActive
                                                ? setAiSearchQuery(
                                                      e.target.value,
                                                  )
                                                : setSearch(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                isAiSearchActive &&
                                                e.key === "Enter"
                                            )
                                                handleAiSearch();
                                            if (
                                                isAiSearchActive &&
                                                e.key === "Escape"
                                            )
                                                cancelAiSearch();
                                        }}
                                        placeholder={
                                            isAiSearchActive
                                                ? "Describe your symptoms and press Enter..."
                                                : "Search by name or specialization"
                                        }
                                        disabled={aiLoading}
                                        className={`w-full pl-9 pr-${isAiSearchActive ? "20" : "4"} py-2.5 text-sm rounded-xl border transition-all focus:outline-none ${
                                            isAiSearchActive
                                                ? "border-[#127fec] bg-blue-50/50 ring-2 ring-[#127fec]/30 shadow-[0_0_16px_rgba(18,127,236,0.15)] placeholder:text-[#127fec]/50"
                                                : "border-slate-200 bg-slate-50 focus:border-[#127fec] focus:ring-2 focus:ring-[#127fec]/20"
                                        }`}
                                    />
                                    {isAiSearchActive && (
                                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            {aiLoading ? (
                                                <Loader2
                                                    size={16}
                                                    className="animate-spin text-[#127fec]"
                                                />
                                            ) : (
                                                <>
                                                    <motion.button
                                                        whileTap={{
                                                            scale: 0.9,
                                                        }}
                                                        onClick={handleAiSearch}
                                                        disabled={
                                                            !aiSearchQuery.trim()
                                                        }
                                                        className="p-1.5 rounded-lg text-white disabled:opacity-40 transition-opacity"
                                                        style={{
                                                            background:
                                                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                                                        }}
                                                    >
                                                        <Send size={12} />
                                                    </motion.button>
                                                    <button
                                                        onClick={cancelAiSearch}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <select
                                    value={dept}
                                    onChange={(e) => setDept(e.target.value)}
                                    className="px-5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#127fec] transition-all text-slate-700 font-medium cursor-pointer"
                                    disabled={isAiSearchActive}
                                >
                                    {departmentsList.map((d) => (
                                        <option key={d} value={d}>
                                            {d === "All"
                                                ? "All Departments"
                                                : d}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Doctor list */}
                            <div className="flex flex-col gap-2">
                                {loadingDoctors ? (
                                    <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                                        <Loader2
                                            size={18}
                                            className="animate-spin"
                                        />
                                        <span className="text-sm">
                                            Loading doctors...
                                        </span>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {filteredDoctors.length === 0 ? (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-center py-8 text-sm text-slate-400"
                                            >
                                                No doctors found.
                                            </motion.div>
                                        ) : (
                                            <>
                                                {filteredDoctors
                                                    .slice(
                                                        (currentPage - 1) * doctorsPerPage,
                                                        currentPage * doctorsPerPage
                                                    )
                                                    .map((doc) => (
                                                        <motion.div
                                                            key={doc.id}
                                                            layout
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.96 }}
                                                        >
                                                            <DoctorCard
                                                                doctor={doc}
                                                                selected={selectedDoctor?.id === doc.id}
                                                                onSelect={(d) => {
                                                                    setSelectedDoctor(d);
                                                                    setSelectedType(null);
                                                                    setSelectedDate(null);
                                                                    setSelectedTime(null);
                                                                }}
                                                            />
                                                        </motion.div>
                                                    ))}
                                                {Math.ceil(filteredDoctors.length / doctorsPerPage) > 1 && (
                                                    <div className="flex justify-between items-center mt-4 px-2">
                                                        <button
                                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                            disabled={currentPage === 1}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                                        >
                                                            <ChevronLeft size={16} /> Previous
                                                        </button>
                                                        <span className="text-xs font-semibold text-slate-500">
                                                            {currentPage} / {Math.ceil(filteredDoctors.length / doctorsPerPage)}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                setCurrentPage((p) =>
                                                                    Math.min(
                                                                        Math.ceil(filteredDoctors.length / doctorsPerPage),
                                                                        p + 1
                                                                    )
                                                                )
                                                            }
                                                            disabled={currentPage === Math.ceil(filteredDoctors.length / doctorsPerPage)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-sm font-semibold text-[#127fec] disabled:opacity-40 disabled:text-slate-500 hover:bg-slate-50 transition-colors"
                                                        >
                                                            Next <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </AnimatePresence>
                                )}
                            </div>
                        </motion.div>

                        {/* Type selector — keep exactly as yours */}
                        <AnimatePresence>
                            {selectedDoctor && (
                                <motion.div
                                    key="type"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="px-1 mb-2">
                                        <h2 className="text-base font-bold text-slate-800">
                                            Appointment Type
                                        </h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            {
                                                id: "online",
                                                label: "Online",
                                                sub: "Video consultation",
                                            },
                                            {
                                                id: "in-person",
                                                label: "In-Person",
                                                sub: "Visit the clinic",
                                            },
                                        ].map(({ id, label, sub }) => {
                                            const sel = selectedType === id;
                                            return (
                                                <motion.div
                                                    key={id}
                                                    whileHover={{ y: -2 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() =>
                                                        setSelectedType(id)
                                                    }
                                                    className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border transition-all ${
                                                        sel
                                                            ? "border-[#127fec] bg-white shadow-lg shadow-blue-100/60"
                                                            : "border-slate-100 bg-white/80 hover:border-slate-200 hover:bg-white"
                                                    }`}
                                                    style={
                                                        sel
                                                            ? {
                                                                  boxShadow:
                                                                      "0 0 0 2px #127fec30, 0 4px 16px rgba(18,127,236,0.10)",
                                                              }
                                                            : {}
                                                    }
                                                >
                                                    <div
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                                                            sel
                                                                ? "bg-[#127fec] text-white"
                                                                : "bg-slate-100 text-slate-400"
                                                        }`}
                                                    >
                                                        {id === "online" ? (
                                                            <Video size={18} />
                                                        ) : (
                                                            <MapPin size={18} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p
                                                            className={`text-sm font-bold truncate ${sel ? "text-[#127fec]" : "text-slate-700"}`}
                                                        >
                                                            {label}
                                                        </p>
                                                        <p className="text-xs text-slate-400 truncate">
                                                            {sub}
                                                        </p>
                                                    </div>
                                                    <AnimatePresence>
                                                        {sel && (
                                                            <motion.div
                                                                initial={{
                                                                    scale: 0,
                                                                    opacity: 0,
                                                                }}
                                                                animate={{
                                                                    scale: 1,
                                                                    opacity: 1,
                                                                }}
                                                                exit={{
                                                                    scale: 0,
                                                                    opacity: 0,
                                                                }}
                                                                className="ml-auto flex-shrink-0"
                                                            >
                                                                <CheckCircle2
                                                                    size={18}
                                                                    className="text-[#127fec]"
                                                                />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Calendar + Time slots */}
                        <AnimatePresence>
                            {selectedType && (
                                <motion.div
                                    key="datetime"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.35 }}
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-2 px-1">
                                            <h2 className="text-base font-bold text-slate-800">
                                                Select Date
                                            </h2>
                                        </div>
                                        {selectedDoctor?.serviceHoursLabel && (
                                            <p className="text-xs text-slate-500 mb-2 px-1 inline-flex items-center gap-1.5">
                                                <Clock size={13} className="text-[#127fec]" />
                                                Service hours: {selectedDoctor.serviceHoursLabel}
                                            </p>
                                        )}
                                        <MiniCalendar
                                            selectedDate={selectedDate}
                                            onSelect={(d) => {
                                                setSelectedDate(d);
                                                setSelectedTime(null);
                                            }}
                                            doctorAvailability={
                                                selectedDoctor?.availability
                                            }
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-2 px-1">
                                            <h2 className="text-base font-bold text-slate-800">
                                                Select Time
                                            </h2>
                                        </div>
                                        <TimeSlotGrid
                                            selectedTime={selectedTime}
                                            onSelect={setSelectedTime}
                                            loading={loadingSlots}
                                            slots={getDynamicSlots()}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── NEW: Symptoms input ── */}
                        <AnimatePresence>
                            {selectedTime && (
                                <motion.div
                                    key="symptoms"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm py-5 px-6"
                                >
                                    <h2 className="text-base font-bold text-slate-800 mb-2">
                                        Describe Your Symptoms
                                    </h2>
                                    <textarea
                                        value={symptoms}
                                        onChange={(e) =>
                                            setSymptoms(e.target.value)
                                        }
                                        placeholder="e.g. I have been experiencing chest pain and shortness of breath for the past 3 days..."
                                        rows={3}
                                        className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:border-[#127fec] focus:ring-2 focus:ring-[#127fec]/20 transition-all resize-none text-slate-700"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT panel — summary card */}
                    <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="w-full lg:w-80 xl:w-[330px] flex-shrink-0 sticky top-24"
                    >
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-5">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50">
                                    <CalendarDays
                                        size={16}
                                        className="text-[#127fec]"
                                    />
                                </div>
                                <h3 className="text-base font-bold text-slate-800">
                                    Appointment Summary
                                </h3>
                            </div>

                            {/* Doctor summary */}
                            <div className="mb-5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
                                    Doctor
                                </span>
                                <AnimatePresence mode="wait">
                                    {selectedDoctor ? (
                                        <motion.div
                                            key={selectedDoctor.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.22 }}
                                            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                                                style={{
                                                    background: `${selectedDoctor.accent}18`,
                                                    color: selectedDoctor.accent,
                                                }}
                                            >
                                                {selectedDoctor.avatar}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">
                                                    {selectedDoctor.name}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {selectedDoctor.specialty}
                                                </p>
                                                {selectedDoctor.serviceHoursLabel && (
                                                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                                                        Service: {selectedDoctor.serviceHoursLabel}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="empty-doc"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <UserCheck
                                                    size={16}
                                                    className="text-slate-300"
                                                />
                                            </div>
                                            <p className="text-sm text-slate-300 font-medium">
                                                Not selected
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="h-px bg-slate-100 mb-5" />

                            <div className="mb-4">
                                <SummaryRow
                                    label="Type"
                                    value={
                                        selectedType
                                            ? selectedType === "online"
                                                ? "Online"
                                                : "In-Person"
                                            : "Not selected"
                                    }
                                    icon={
                                        selectedType === "online"
                                            ? Video
                                            : MapPin
                                    }
                                    done={!!selectedType}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <SummaryRow
                                    label="Date"
                                    value={
                                        selectedDate
                                            ? dateLabel
                                            : "Not selected"
                                    }
                                    icon={CalendarDays}
                                    done={!!selectedDate}
                                />
                                <SummaryRow
                                    label="Time"
                                    value={selectedTime ?? "Not selected"}
                                    icon={Clock}
                                    done={!!selectedTime}
                                />
                            </div>

                            <AnimatePresence>
                                {selectedDoctor && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center justify-between py-3 mb-4 border-t border-slate-100"
                                    >
                                        <span className="text-sm text-slate-500 font-medium">
                                            Consultation Fee
                                        </span>
                                        <span className="text-xl font-bold text-slate-800">
                                            ৳{selectedDoctor.fee}.00
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Error */}
                            {bookingError && (
                                <p className="text-red-500 text-xs text-center mb-3">
                                    {bookingError}
                                </p>
                            )}

                            {/* Confirm button */}
                            <motion.button
                                whileHover={canConfirm ? { scale: 1.02 } : {}}
                                whileTap={canConfirm ? { scale: 0.97 } : {}}
                                onClick={handleConfirm}
                                disabled={!canConfirm || bookingLoading}
                                className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300
                                    ${
                                        canConfirm
                                            ? "text-white shadow-lg shadow-blue-200 cursor-pointer"
                                            : "text-slate-400 bg-slate-100 cursor-not-allowed"
                                    }`}
                                style={
                                    canConfirm
                                        ? {
                                              background:
                                                  "linear-gradient(135deg, #0a5bbf, #127fec)",
                                          }
                                        : {}
                                }
                            >
                                {bookingLoading ? (
                                    <>
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />{" "}
                                        Booking...
                                    </>
                                ) : canConfirm ? (
                                    <>
                                        Confirm Booking <ArrowRight size={16} />
                                    </>
                                ) : (
                                    "Complete all steps above"
                                )}
                            </motion.button>
                        </div>

                        {/* Progress tracker — keep exactly as yours */}
                        <div className="mt-4 bg-white/80 rounded-2xl border border-slate-100 shadow-sm p-4">
                            <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">
                                Your Progress
                            </p>
                            <div className="flex items-center gap-2">
                                {[
                                    { label: "Doctor", done: !!selectedDoctor },
                                    { label: "Type", done: !!selectedType },
                                    { label: "Date", done: !!selectedDate },
                                    { label: "Time", done: !!selectedTime },
                                ].map((step, i, arr) => (
                                    <div
                                        key={step.label}
                                        className="flex items-center gap-2 flex-1"
                                    >
                                        <div className="flex flex-col items-center gap-1 flex-1">
                                            <motion.div
                                                animate={{
                                                    background: step.done
                                                        ? "linear-gradient(135deg, #0a5bbf, #127fec)"
                                                        : "#e2e8f0",
                                                    scale: step.done ? 1.1 : 1,
                                                }}
                                                transition={{ duration: 0.3 }}
                                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                            >
                                                {step.done ? (
                                                    <CheckCircle2
                                                        size={12}
                                                        className="text-white"
                                                    />
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {i + 1}
                                                    </span>
                                                )}
                                            </motion.div>
                                            <span
                                                className={`text-[10px] font-semibold ${step.done ? "text-[#127fec]" : "text-slate-400"}`}
                                            >
                                                {step.label}
                                            </span>
                                        </div>
                                        {i < arr.length - 1 && (
                                            <motion.div
                                                animate={{
                                                    background: step.done
                                                        ? "#127fec"
                                                        : "#e2e8f0",
                                                }}
                                                transition={{ duration: 0.4 }}
                                                className="h-0.5 flex-1 rounded-full mb-3"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
