import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    FileText,
    User,
    Pill,
    Download,
    CalendarDays,
    Loader2,
    Stethoscope,
    ClipboardList,
    MessageSquare,
    Sparkles,
    AlertCircle
} from "lucide-react";
import appointmentService from "../../api/appointmentService";
import aiService from "../../api/aiService";
import MarkdownRenderer from "../../components/MarkdownRenderer";

const Motion = motion;

function formatTime(timeStr) {
    if (!timeStr) return "—";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export default function PatientPrescriptionView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [prescription, setPrescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState("");

    // AI Summary State
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryText, setSummaryText] = useState("");

    const recommendedTests = String(prescription?.recommended_tests || "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

    useEffect(() => {
        appointmentService
            .getPatientPrescription(id)
            .then(setPrescription)
            .catch(() => setError("Could not load prescription. It may not exist yet."))
            .finally(() => setLoading(false));
    }, [id]);

    const handleGenerateSummary = async () => {
        setSummaryLoading(true);

        try {
            const summary = await aiService.getPrescriptionSummary(id);
            setSummaryText(summary);
        } catch (err) {
            setSummaryText("⚠️ Failed to generate summary. " + (err?.response?.data?.message || "AI service may be temporarily unavailable. Please try again later."));
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleDownloadReport = async () => {
        setDownloadError("");
        setDownloading(true);

        try {
            const pdfBlob = await appointmentService.getPatientPrescriptionPdf(id);
            const fileUrl = URL.createObjectURL(pdfBlob);

            const safeDate = String(prescription?.appointment_date || "").slice(0, 10) || "report";
            const link = document.createElement("a");
            link.href = fileUrl;
            link.download = `prescription-${id}-${safeDate}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        } catch (err) {
            setDownloadError(
                err?.response?.data?.message ||
                    "Failed to download report. Please try again.",
            );
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#eff6ff] flex items-center justify-center">
                <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm">Loading prescription...</span>
                </div>
            </div>
        );
    }

    if (error || !prescription) {
        return (
            <div className="min-h-screen bg-[#eff6ff] flex flex-col items-center justify-center gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
                    <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={28} className="text-red-400" />
                    </div>
                    <p className="text-slate-700 font-semibold mb-1">No Prescription Found</p>
                    <p className="text-slate-500 text-sm">{error || "No prescription has been uploaded for this appointment yet."}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-6 px-6 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#eff6ff] py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden"
                >
                    {/* Header Banner */}
                    <div
                        className="px-8 py-6 text-white"
                        style={{ background: "linear-gradient(135deg, #0a5bbf, #127fec)" }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-wide">PRESCRIPTION</h1>
                                    <p className="text-blue-100 text-xs mt-0.5">PulsePortal Medical System</p>
                                </div>
                            </div>
                            <div className="text-right text-sm text-blue-100">
                                <p className="font-semibold text-white">{formatDate(prescription.appointment_date)}</p>
                                <p className="text-xs mt-0.5">{formatTime(prescription.appointment_time)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Doctor & Patient Info */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Doctor */}
                            <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                                        <Stethoscope size={14} className="text-indigo-500" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Prescribing Doctor
                                    </p>
                                </div>
                                <p className="font-bold text-slate-800">
                                    Dr. {prescription.doctor_name}
                                </p>
                                {prescription.doctor_specialization && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        {prescription.doctor_specialization}
                                    </p>
                                )}
                                {prescription.doctor_license && (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        License: {prescription.doctor_license}
                                    </p>
                                )}
                            </div>

                            {/* Patient */}
                            <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <User size={14} className="text-[#127fec]" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Patient
                                    </p>
                                </div>
                                <p className="font-bold text-slate-800">{prescription.patient_name}</p>
                                {prescription.disease_or_problem && (
                                    <p className="text-xs text-slate-500 mt-2 bg-white border border-slate-100 rounded-lg px-2 py-1">
                                        <span className="font-semibold">Diagnosis:</span>{" "}
                                        {prescription.disease_or_problem}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Medicines */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <Pill size={14} className="text-[#127fec]" />
                                </div>
                                <h3 className="font-semibold text-slate-800">Prescribed Medicines</h3>
                            </div>

                            {prescription.medicines && prescription.medicines.length > 0 ? (
                                <div className="space-y-3">
                                    {/* Column Headers */}
                                    <div className="grid grid-cols-3 gap-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                        <div>Medicine</div>
                                        <div>Dosage</div>
                                        <div>Instructions</div>
                                    </div>
                                    {prescription.medicines.map((med, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.06 }}
                                            className="grid grid-cols-3 gap-4 items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3"
                                        >
                                            <div>
                                                <p className="font-semibold text-slate-800 text-sm">
                                                    {med.name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-600">
                                                    {med.dosage || "—"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-600">
                                                    {med.instruction || "—"}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No medicines listed.</p>
                            )}
                        </div>

                        {/* Doctor's Notes */}
                        {prescription.notes && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                                        <ClipboardList size={14} className="text-amber-500" />
                                    </div>
                                    <h3 className="font-semibold text-slate-800">Doctor's Notes</h3>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {prescription.notes}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Recommended Tests */}
                        {recommendedTests.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <ClipboardList size={14} className="text-[#127fec]" />
                                    </div>
                                    <h3 className="font-semibold text-slate-800">
                                        Recommended Tests / Reports
                                    </h3>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
                                    <ul className="space-y-2">
                                        {recommendedTests.map((item, index) => (
                                            <li
                                                key={`${item}-${index}`}
                                                className="text-sm text-slate-700 leading-relaxed list-disc ml-5"
                                            >
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <CalendarDays size={14} className="text-slate-400" />
                                <span className="text-xs text-slate-400">
                                    Issued on {formatDate(prescription.appointment_date)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleDownloadReport}
                                    disabled={downloading}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {downloading ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={14} />
                                            Download Report
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => navigate(-1)}
                                    className="px-6 py-2.5 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        {downloadError && (
                            <p className="text-xs text-red-500 text-right -mt-4">
                                {downloadError}
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* AI Prescription Summary (Frontend Mockup) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-6 bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden p-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-[#127fec]">
                            <MessageSquare size={16} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base tracking-wide">Prescription AI Summary</h3>
                            <p className="text-xs text-slate-500">Get a simplified explanation of your prescription and advice</p>
                        </div>
                    </div>
                    
                    {!summaryText && !summaryLoading ? (
                        <button 
                            onClick={handleGenerateSummary}
                            className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-blue-100 transition-colors"
                        >
                            <Sparkles size={16} /> Generate Summary
                        </button>
                    ) : summaryLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 w-full lg:w-3/4">
                            <Loader2 size={16} className="animate-spin text-blue-500" />
                            Analyzing prescription and generating summary...
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
                </motion.div>
            </div>
        </div>
    );
}
