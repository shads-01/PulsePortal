import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PhoneOff, FileText, Loader2 } from "lucide-react";
import consultationService from "../../api/consultationService";
import authService from "../../api/authService";

export default function PatientConsultation() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [roomName, setRoomName] = useState("");
    const [status, setStatus] = useState("loading"); // loading, waiting, started, ended
    const user = authService.getCurrentUser();

    useEffect(() => {
        checkConsultation();
        
        // Poll every 5 seconds if waiting
        const interval = setInterval(() => {
            if (status === "waiting") checkConsultation();
        }, 5000);

        return () => clearInterval(interval);
    }, [status]);

    const checkConsultation = async () => {
        try {
            const res = await consultationService.getPatientConsultation(id);
            if (!res || res.status === "waiting") {
                setStatus("waiting");
            } else if (res.status === "success") {
                if (res.data.status === "ended") {
                    setStatus("ended");
                } else if (res.data.status === "started") {
                    setRoomName(res.data.room_name);
                    setStatus("started");
                }
            }
        } catch (e) {
            console.error("Failed to fetch consultation", e);
            setStatus("error");
        }
    };

    const handleLeaveCall = () => {
        navigate("/patient/appointments");
    };

    return (
        <div className="min-h-screen bg-[#0f172a] p-4 flex gap-4">
            {/* LEFT: FULL VIDEO / JITSI IFRAME */}
            <div className="flex-1 bg-black rounded-2xl overflow-hidden shadow-xl border border-slate-800 flex flex-col min-h-[500px] relative">

                {status === "loading" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <Loader2 className="animate-spin" size={32} />
                        <p>Connecting...</p>
                    </div>
                )}

                {status === "waiting" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-900">
                        <div className="h-16 w-16 mb-2 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
                            <Video className="text-slate-500" size={24} />
                        </div>
                        <p className="text-xl font-semibold text-white">Waiting for your doctor...</p>
                        <p className="text-sm">The consultation hasn't started yet. Please stay on this page.</p>
                        <button onClick={handleLeaveCall} className="mt-6 px-6 py-2 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800">
                            Go Back
                        </button>
                    </div>
                )}

                {status === "ended" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-slate-900">
                        <PhoneOff size={48} className="text-red-500 mb-2" />
                        <p className="text-2xl font-bold">Consultation Ended</p>
                        <p className="text-sm text-slate-400">The doctor has ended this session.</p>
                        <button onClick={handleLeaveCall} className="mt-4 px-6 py-2 bg-[#127fec] rounded-full font-semibold">
                            Return to Appointments
                        </button>
                    </div>
                )}

                {status === "started" && roomName && (
                    <div className="flex-1 relative w-full h-full min-h-[600px]">
                        <iframe
                            allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
                            src={`https://meet.jit.si/${roomName}?userInfo.displayName="${encodeURIComponent(user?.name || 'Patient')}"`}
                            className="w-full h-full border-0 absolute top-0 left-0"
                            title="Jitsi Video Consultation"
                        ></iframe>
                    </div>
                )}

                {/* Controls */}
                {status === "started" && (
                    <div className="w-full p-4 bg-slate-900 border-t border-slate-800 flex justify-center gap-4 shrink-0">
                        <button onClick={handleLeaveCall}
                            className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-full text-white font-semibold flex items-center gap-2 shadow-lg shadow-red-500/30 transition">
                            <PhoneOff size={18} />
                            Leave Room
                        </button>
                    </div>
                )}
            </div>

            {/* RIGHT PANEL - Kept minimal for future extensions */}
            <div className="w-[320px] bg-slate-900 rounded-2xl shadow-lg p-6 flex flex-col gap-4 border border-slate-800 text-white hidden lg:flex">
                <div>
                    <h3 className="text-sm border-b border-slate-800 pb-2 mb-4 text-slate-400 font-semibold uppercase tracking-wider">
                        Quick Info
                    </h3>
                    <p className="text-sm text-slate-300">
                        Ask your doctor to upload scripts to your profile when the visit concludes.
                    </p>
                </div>
                
                <div className="mt-auto bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <FileText className="text-[#127fec] mb-2" size={20} />
                    <h4 className="font-semibold text-sm mb-1">Prescriptions & Files</h4>
                    <p className="text-xs text-slate-400 mb-3">
                        If prescribed, files will appear below when shared by the doctor.
                    </p>
                    {status === "started" && (
                        <a href="#" onClick={(e) => { e.preventDefault(); alert("Downloading Prescription Document..."); }} 
                           className="flex items-center gap-2 text-sm text-[#127fec] hover:underline bg-[#127fec]/10 p-2 rounded-lg transition border border-[#127fec]/20">
                            <FileText size={16} />
                            rx_prescription.pdf
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}