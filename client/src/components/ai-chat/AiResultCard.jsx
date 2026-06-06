import { motion } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle, Sparkles, Stethoscope } from "lucide-react";


const URGENCY_CONFIG = {
    Routine: {
        color: "text-emerald-600",
        bg: "bg-emerald-50/80",
        border: "border-emerald-100",
        icon: CheckCircle,
    },
    Soon: {
        color: "text-amber-600",
        bg: "bg-amber-50/80",
        border: "border-amber-100",
        icon: Clock,
    },
    Urgent: {
        color: "text-red-600",
        bg: "bg-red-50/80",
        border: "border-red-100",
        icon: AlertTriangle,
    },
};

export default function AIResultCard({ result }) {
    const cfg = URGENCY_CONFIG[result.urgency] || URGENCY_CONFIG.Routine;
    const Icon = cfg.icon;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mx-1 mt-1 rounded-2xl overflow-hidden rounded-bl-sm shadow-lg"
            style={{
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(18,127,236,0.18)",
                boxShadow: "0 0 0 1px rgba(18,127,236,0.08), 0 8px 32px rgba(18,127,236,0.12)",
            }}
        >
            <div
                className="px-4 py-3 flex items-center gap-2 relative overflow-hidden"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(239,246,255,0.9), rgba(219,234,254,0.9))",
                }}
            >
                <Sparkles size={14} className="text-[#127fec] relative z-10" />
                <p className="text-xs font-bold text-[#127fec] tracking-wider relative z-10">
                    AI Guidance Result
                </p>
            </div>

            <div className="px-4 py-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50/80 border border-blue-100 backdrop-blur-sm">
                        <Stethoscope size={12} className="text-[#127fec]" />
                        <span className="text-xs font-semibold text-[#127fec]">
                            {result.specialty}
                        </span>
                    </div>
                    <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-sm ${cfg.bg} ${cfg.border}`}
                    >
                        <Icon size={12} className={cfg.color} />
                        <span className={`text-xs font-semibold ${cfg.color}`}>
                            {result.urgency}
                        </span>
                    </div>
                </div>

                <ul className="flex flex-col gap-1.5 pl-1">
                    {result.summary.map((point, i) => (
                        <li
                            key={i}
                            className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed"
                        >
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#127fec] flex-shrink-0" />
                            {point}
                        </li>
                    ))}
                </ul>
                {/* 
                <div className="flex gap-2 pt-1">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                        style={{
                            background:
                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                        }}
                    >
                        <CalendarPlus size={13} /> Use for Booking
                    </motion.button>
                </div> */}
            </div>
        </motion.div>
    );
}