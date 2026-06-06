import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { PhoneOff, Video, FileText, Upload } from "lucide-react";
import appointmentService from "../../api/appointmentService";
import consultationService from "../../api/consultationService";
import authService from "../../api/authService";

export default function DoctorConsultation() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    const [appointment, setAppointment] = useState(null);
    const [roomName, setRoomName] = useState(location.state?.room_name || "");
    const [fileName, setFileName] = useState("");
    const user = authService.getCurrentUser();

    useEffect(() => {
        loadAppointment();
    }, []);

    const loadAppointment = async () => {
        try {
            const data = await appointmentService.getDoctorAppointments();
            const selected = data.find((item) => item.id.toString() === id);
            setAppointment(selected);

            if (!roomName) {
                // Try to get room name from backend if not in location state
                const consData = await consultationService.startConsultation(id);
                setRoomName(consData.room_name);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEndCall = async () => {
        try {
            await consultationService.endConsultation(id);
        } catch (e) {
            console.error("Failed to end consultation properly", e);
        }
        navigate(`/doctor/prescription-preview/${id}`);
    };

    // Restore Upload Prescription Logic
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);

        navigate(`/doctor/prescription-preview/${appointment.id}`, {
            state: { file, appointment },
        });
    };



    return (
        <div className="min-h-screen bg-[#f1f5f9] p-6 grid lg:grid-cols-4 gap-6">
            {/* LEFT SIDE */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow p-6 flex flex-col">
                <h2 className="text-lg font-semibold mb-4">Consultation Room</h2>

                {/* Video Area Jitsi iframe */}
                <div className="flex-1 bg-black rounded-xl overflow-hidden relative min-h-[500px]">
                    {!roomName ? (
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                            Starting consultation...
                        </div>
                    ) : (
                        <iframe
                            allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
                            src={`https://meet.jit.si/${roomName}?userInfo.displayName="${encodeURIComponent('Dr. ' + (user?.name || 'Doctor'))}"`}
                            className="w-full h-full border-0 absolute top-0 left-0"
                            title="Jitsi Video Consultation"
                        ></iframe>
                    )}
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={handleEndCall}
                        className="px-5 py-2 bg-red-500 hover:bg-red-600 transition text-white rounded-full flex items-center gap-2 font-semibold"
                    >
                        <PhoneOff size={16} />
                        End Session & Complete
                    </button>
                </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="bg-white rounded-2xl shadow p-6 space-y-6">
                <div>
                    <h3 className="font-semibold mb-2">Patient Info</h3>
                    <div className="bg-slate-100 p-3 rounded-xl">
                        <p className="font-medium">
                            {appointment?.patient_name || "Loading..."}
                        </p>
                        <p className="text-sm text-slate-500">
                            {appointment?.appointment_date || ""}
                        </p>
                        {appointment?.symptoms && (
                            <p className="text-sm text-slate-600 mt-2 bg-white p-2 rounded border border-slate-200">
                                <span className="font-semibold block text-xs">Symptoms:</span>
                                {appointment.symptoms}
                            </p>
                        )}
                    </div>
                </div>

                {/* Video Button */}
                <button className="w-full bg-blue-50 hover:bg-blue-100 transition p-3 rounded-xl flex gap-2 items-center text-sm">
                    <Video size={16}/> Video Call
                </button>

                {/* Files */}
                <button className="w-full bg-slate-50 hover:bg-slate-100 transition p-3 rounded-xl flex gap-2 items-center text-sm">
                    <FileText size={16}/> Files
                </button>

                {/* Upload Prescription */}
                <label className="border-2 border-dashed border-[#127fec] text-[#127fec] p-4 rounded-xl text-center text-sm cursor-pointer hover:bg-blue-50 block transition font-semibold">
                    <Upload size={20} className="mx-auto mb-2" />
                    Upload Prescription

                    <input
                        type="file"
                        accept="image/*,.pdf"
                        hidden
                        onChange={handleFileUpload}
                    />
                </label>

                {/* Show file name */}
                {fileName && (
                    <p className="text-xs text-slate-500 text-center">
                        Selected: {fileName}
                    </p>
                )}



                {/* Notes */}
                <textarea
                    placeholder="Write notes..."
                    className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    rows={4}
                ></textarea>

            </div>
        </div>
    );
}