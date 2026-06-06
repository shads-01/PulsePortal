import { useCallback, useEffect, useMemo, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
    AlertCircle,
    ArrowRightLeft,
    BedDouble,
    Building2,
    CalendarDays,
    CheckCheck,
    CheckCircle2,
    ClipboardList,
    Clock3,
    FileText,
    Filter,
    Info,
    Landmark,
    Loader2,
    NotebookPen,
    Phone,
    Plus,
    Search,
    ShieldAlert,
    Stethoscope,
    UserCircle2,
    UserPlus,
    X,
    XCircle,
} from "lucide-react";
import authService from "../../api/authService";
import roomAdmissionService from "../../api/roomAdmissionService";

const CREATE_ROLES = new Set(["Super Admin", "Front Desk Admin"]);

const ADMISSION_TYPES = [
    "Emergency",
    "Planned Procedure",
    "Post Surgery",
    "Observation",
    "Maternity",
];

const GENDERS = ["Male", "Female", "Other"];
const PRIORITIES = ["Critical", "High", "Normal", "Low"];
const PAYER_TYPES = ["Self", "Insurance", "Corporate", "Government"];

const STATUS_META = {
    pending: {
        label: "Pending",
        className: "bg-amber-100 text-amber-700 border border-amber-200",
    },
    admitted: {
        label: "Admitted",
        className: "bg-blue-100 text-blue-700 border border-blue-200",
    },
    transfer: {
        label: "Transfer",
        className: "bg-purple-100 text-purple-700 border border-purple-200",
    },
    discharged: {
        label: "Discharged",
        className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    },
    cancelled: {
        label: "Cancelled",
        className: "bg-rose-100 text-rose-700 border border-rose-200",
    },
};

const STATUS_FILTERS = [
    "all",
    "pending",
    "admitted",
    "transfer",
    "discharged",
    "cancelled",
];

const PER_PAGE = 7;

const DEFAULT_PAGE_META = {
    current_page: 1,
    per_page: PER_PAGE,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
};

const DEFAULT_STATUS_COUNTS = {
    all: 0,
    pending: 0,
    admitted: 0,
    transfer: 0,
    discharged: 0,
    cancelled: 0,
};

function normalizeLookupValue(value) {
    return String(value || "").trim().toLowerCase();
}

const EMPTY_AUTO_FILLED_PATIENT_PROFILE = {
    contact_phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
};

function createInitialForm(scopedDepartment = "") {
    return {
        patient_name: "",
        patient_id: "",
        patient_age: "",
        patient_gender: "",
        contact_phone: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        admission_type: "",
        department: scopedDepartment,
        doctor_id: "",
        attending_doctor: "",
        room_id: "",
        bed_id: "",
        payer_type: "",
        estimated_stay_days: "",
        priority: "",
        notes: "",
    };
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function StatCard({ title, value, hint, icon }) {
    return (
        <Motion.div
            whileHover={{ y: -3 }}
            className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
                    <p className="text-xs text-slate-500 mt-2">{hint}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    {icon}
                </div>
            </div>
        </Motion.div>
    );
}

function StatusChip({ status }) {
    const meta = STATUS_META[status] || {
        label: status,
        className: "bg-slate-100 text-slate-700 border border-slate-200",
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${meta.className}`}
        >
            {meta.label}
        </span>
    );
}

function FormField({
    label,
    icon,
    error,
    children,
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="inline-flex items-center gap-2">
                    <span className="text-slate-400">{icon}</span>
                    {label}
                </span>
            </label>
            {children}
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>
    );
}

function baseInputClass(hasError) {
    return `w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
        hasError
            ? "border-rose-300 focus:ring-rose-200"
            : "border-slate-200 focus:ring-blue-200 focus:border-blue-400"
    }`;
}

export default function RoomAdmissions() {
    const currentUser = authService.getCurrentUser();
    const isFrontDeskAdmin = currentUser?.admin_role === "Front Desk Admin";
    const canCreateAdmission = CREATE_ROLES.has(currentUser?.admin_role || "");
    const requiresDepartmentSelection = !isFrontDeskAdmin;
    const scopedDepartment = canCreateAdmission ? "" : currentUser?.department || "";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busyKey, setBusyKey] = useState("");

    const [admissions, setAdmissions] = useState([]);
    const [admissionMeta, setAdmissionMeta] = useState(DEFAULT_PAGE_META);
    const [statusCounts, setStatusCounts] = useState(DEFAULT_STATUS_COUNTS);
    const [rooms, setRooms] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    const [patientMatchState, setPatientMatchState] = useState(null);
    const [autoFilledPatientProfile, setAutoFilledPatientProfile] = useState(
        EMPTY_AUTO_FILLED_PATIENT_PROFILE,
    );

    const [banner, setBanner] = useState(null);

    const [form, setForm] = useState(() => createInitialForm(scopedDepartment));
    const [errors, setErrors] = useState({});

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [page, setPage] = useState(1);

    const [selectedAdmissionId, setSelectedAdmissionId] = useState(null);
    const [transferDraft, setTransferDraft] = useState({
        room_id: "",
        bed_id: "",
        note: "",
    });
    const [noteDraft, setNoteDraft] = useState("");

    const selectedAdmission = useMemo(() => {
        return admissions.find((item) => item.id === selectedAdmissionId) || null;
    }, [admissions, selectedAdmissionId]);

    const loadStaticData = useCallback(async () => {
        try {
            const [roomData, departmentData, doctorData, patientData] = await Promise.all([
                roomAdmissionService.getRoomInventory(),
                roomAdmissionService.getDepartments(),
                roomAdmissionService.getDoctors(),
                roomAdmissionService.getPatients(),
            ]);

            setRooms(roomData);
            setDepartments(departmentData);
            setDoctors(doctorData);
            setPatients(patientData);
        } catch (error) {
            setBanner({
                type: "error",
                message:
                    error?.message ||
                    "Unable to load room admission directories.",
            });
        }
    }, []);

    const loadAdmissions = useCallback(async ({ withLoading = true, targetPage = page } = {}) => {
        if (withLoading) {
            setLoading(true);
        }

        try {
            const admissionData = await roomAdmissionService.getAdmissions({
                page: targetPage,
                per_page: PER_PAGE,
                search: searchTerm.trim() || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                department:
                    departmentFilter !== "all" ? departmentFilter : undefined,
            });

            setAdmissions(admissionData.items || []);
            setAdmissionMeta(admissionData.meta || DEFAULT_PAGE_META);
            setStatusCounts(admissionData.status_counts || DEFAULT_STATUS_COUNTS);
        } catch (error) {
            setBanner({
                type: "error",
                message:
                    error?.message ||
                    "Unable to load room admission data. Please refresh.",
            });
        } finally {
            if (withLoading) {
                setLoading(false);
            }
        }
    }, [departmentFilter, page, searchTerm, statusFilter]);

    const refreshAdmissionContext = useCallback(async ({ targetPage = page } = {}) => {
        await Promise.all([
            loadAdmissions({ withLoading: false, targetPage }),
            loadStaticData(),
        ]);
    }, [loadAdmissions, loadStaticData, page]);

    useEffect(() => {
        loadStaticData();
    }, [loadStaticData]);

    useEffect(() => {
        loadAdmissions();
    }, [loadAdmissions]);

    useEffect(() => {
        if (!scopedDepartment) {
            return;
        }
        setForm((prev) => ({
            ...prev,
            department: scopedDepartment,
            room_id: "",
            bed_id: "",
            doctor_id: "",
            attending_doctor: "",
        }));
    }, [scopedDepartment]);

    useEffect(() => {
        if (!selectedAdmission) {
            setTransferDraft({ room_id: "", bed_id: "", note: "" });
            setNoteDraft("");
            return;
        }

        setTransferDraft({
            room_id: "",
            bed_id: "",
            note: `Reason for transfer from ${selectedAdmission.room_number}`,
        });
        setNoteDraft("");
    }, [selectedAdmission]);

    const visibleRooms = useMemo(() => {
        if (!scopedDepartment) {
            return rooms;
        }
        return rooms.filter((item) => item.department === scopedDepartment);
    }, [rooms, scopedDepartment]);

    const departmentOptions = useMemo(() => {
        const dynamicOptions = new Set([
            ...departments,
            ...rooms.map((room) => room.department),
            ...doctors.map((doctor) => doctor.department),
        ]);

        return Array.from(dynamicOptions).filter(Boolean).sort();
    }, [departments, doctors, rooms]);

    const doctorsForDepartment = useMemo(() => {
        const registeredDoctors = doctors
            .filter((doctor) => doctor?.name && doctor?.is_available !== false)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (form.department) {
            return registeredDoctors.filter((doctor) => {
                return doctor.department === form.department;
            });
        }

        return isFrontDeskAdmin ? registeredDoctors : [];
    }, [doctors, form.department, isFrontDeskAdmin]);

    const patientDirectoryByName = useMemo(() => {
        const groupedPatients = new Map();

        patients.forEach((patient) => {
            const key = normalizeLookupValue(patient.name);
            if (!key) {
                return;
            }

            const currentGroup = groupedPatients.get(key) || [];
            currentGroup.push(patient);
            groupedPatients.set(key, currentGroup);
        });

        return groupedPatients;
    }, [patients]);

    const patientNameOptions = useMemo(() => {
        return [...patients]
            .filter((patient) => patient?.name)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [patients]);

    const roomOptions = useMemo(() => {
        if (!form.department) {
            return visibleRooms;
        }

        return visibleRooms.filter((room) => room.department === form.department);
    }, [form.department, visibleRooms]);

    const selectedRoom = useMemo(() => {
        return rooms.find((room) => room.id === form.room_id) || null;
    }, [form.room_id, rooms]);

    const availableBeds = useMemo(() => {
        if (!selectedRoom) {
            return [];
        }
        return selectedRoom.beds.filter((bed) => bed.status === "available");
    }, [selectedRoom]);

    const totalPages = Math.max(1, admissionMeta.last_page || 1);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const inventorySummary = useMemo(() => {
        const totalBeds = visibleRooms.reduce((sum, room) => {
            return sum + room.beds.length;
        }, 0);

        const occupiedBeds = visibleRooms.reduce((sum, room) => {
            return (
                sum +
                room.beds.filter((bed) => bed.status === "occupied").length
            );
        }, 0);

        const activeAdmissions =
            (statusCounts.admitted || 0) + (statusCounts.transfer || 0);

        const pendingAdmissions = statusCounts.pending || 0;

        return {
            totalBeds,
            occupiedBeds,
            availableBeds: Math.max(0, totalBeds - occupiedBeds),
            activeAdmissions,
            pendingAdmissions,
        };
    }, [statusCounts, visibleRooms]);

    const transferRoomOptions = useMemo(() => {
        if (!selectedAdmission) {
            return [];
        }

        return rooms.filter((room) => {
            return (
                room.department === selectedAdmission.department &&
                room.id !== selectedAdmission.room_id
            );
        });
    }, [rooms, selectedAdmission]);

    const selectedTransferRoom = useMemo(() => {
        if (!transferDraft.room_id) {
            return null;
        }
        return rooms.find((room) => room.id === transferDraft.room_id) || null;
    }, [rooms, transferDraft.room_id]);

    const transferBedOptions = useMemo(() => {
        if (!selectedTransferRoom) {
            return [];
        }
        return selectedTransferRoom.beds.filter((bed) => bed.status === "available");
    }, [selectedTransferRoom]);

    function handleFormChange(event) {
        const { name, value } = event.target;
        const normalizedPatientName =
            name === "patient_name" ? normalizeLookupValue(value) : "";
        const matchedPatients =
            name === "patient_name" && normalizedPatientName
                ? patientDirectoryByName.get(normalizedPatientName) || []
                : [];
        const matchedPatient = matchedPatients.length === 1 ? matchedPatients[0] : null;
        const selectedDoctor =
            name === "doctor_id"
                ? doctorsForDepartment.find((doctor) => doctor.id === value) || null
                : null;
        const matchedProfileAutoFill = matchedPatient
            ? {
                contact_phone: matchedPatient.phone || "",
                emergency_contact_name: matchedPatient.emergency_contact || "",
                emergency_contact_phone: matchedPatient.emergency_phone || "",
            }
            : EMPTY_AUTO_FILLED_PATIENT_PROFILE;

        if (name === "patient_name") {
            if (!normalizedPatientName) {
                setPatientMatchState(null);
                setAutoFilledPatientProfile(EMPTY_AUTO_FILLED_PATIENT_PROFILE);
            } else if (matchedPatient) {
                const hasContactOrEmergencyProfile = Boolean(
                    matchedProfileAutoFill.contact_phone ||
                    matchedProfileAutoFill.emergency_contact_name ||
                    matchedProfileAutoFill.emergency_contact_phone,
                );

                setPatientMatchState({
                    type: "matched",
                    message: hasContactOrEmergencyProfile
                        ? "Matched patient profile. Phone and emergency contact details auto-filled."
                        : "Matched patient profile.",
                });
                setAutoFilledPatientProfile(matchedProfileAutoFill);
            } else if (matchedPatients.length > 1) {
                setPatientMatchState({
                    type: "ambiguous",
                    message: "Multiple patients found with this name. Please verify contact details manually.",
                });
                setAutoFilledPatientProfile(EMPTY_AUTO_FILLED_PATIENT_PROFILE);
            } else {
                setPatientMatchState(null);
                setAutoFilledPatientProfile(EMPTY_AUTO_FILLED_PATIENT_PROFILE);
            }
        }

        if (
            name === "contact_phone" ||
            name === "emergency_contact_name" ||
            name === "emergency_contact_phone"
        ) {
            setAutoFilledPatientProfile((prev) => ({ ...prev, [name]: "" }));
        }

        setForm((prev) => {
            const next = { ...prev, [name]: value };

            if (name === "patient_name" && matchedPatient) {
                next.patient_id = matchedPatient.id || "";
                next.contact_phone = matchedProfileAutoFill.contact_phone;
                next.emergency_contact_name = matchedProfileAutoFill.emergency_contact_name;
                next.emergency_contact_phone = matchedProfileAutoFill.emergency_contact_phone;
            }

            if (name === "patient_name" && !matchedPatient) {
                next.patient_id = "";

                if (
                    autoFilledPatientProfile.contact_phone &&
                    prev.contact_phone === autoFilledPatientProfile.contact_phone
                ) {
                    next.contact_phone = "";
                }

                if (
                    autoFilledPatientProfile.emergency_contact_name &&
                    prev.emergency_contact_name === autoFilledPatientProfile.emergency_contact_name
                ) {
                    next.emergency_contact_name = "";
                }

                if (
                    autoFilledPatientProfile.emergency_contact_phone &&
                    prev.emergency_contact_phone === autoFilledPatientProfile.emergency_contact_phone
                ) {
                    next.emergency_contact_phone = "";
                }
            }

            if (name === "department") {
                next.doctor_id = "";
                next.attending_doctor = "";
                next.room_id = "";
                next.bed_id = "";
            }

            if (name === "doctor_id") {
                next.attending_doctor = selectedDoctor?.name || "";
            }

            if (name === "room_id") {
                next.bed_id = "";
            }

            return next;
        });

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }

        if (name === "doctor_id" && errors.attending_doctor) {
            setErrors((prev) => ({ ...prev, attending_doctor: "" }));
        }

        if (name === "patient_name" && matchedPatient) {
            setErrors((prev) => ({
                ...prev,
                contact_phone: "",
                emergency_contact_name: "",
                emergency_contact_phone: "",
            }));
        }
    }

    function validateForm() {
        const nextErrors = {};

        if (!form.patient_name.trim()) nextErrors.patient_name = "Patient name is required.";
        if (!form.patient_age || Number.isNaN(Number(form.patient_age))) {
            nextErrors.patient_age = "Patient age is required.";
        } else if (Number(form.patient_age) < 0 || Number(form.patient_age) > 120) {
            nextErrors.patient_age = "Age must be between 0 and 120.";
        }

        if (!form.patient_gender) nextErrors.patient_gender = "Gender is required.";
        if (!form.contact_phone.trim()) nextErrors.contact_phone = "Contact phone is required.";
        if (!form.emergency_contact_name.trim()) {
            nextErrors.emergency_contact_name = "Emergency contact name is required.";
        }
        if (!form.emergency_contact_phone.trim()) {
            nextErrors.emergency_contact_phone = "Emergency contact phone is required.";
        }
        if (!form.admission_type) nextErrors.admission_type = "Admission type is required.";
        if (requiresDepartmentSelection && !form.department) {
            nextErrors.department = "Department is required.";
        }
        if (!form.doctor_id) {
            nextErrors.attending_doctor = "Attending doctor is required.";
        } else if (!doctorsForDepartment.some((doctor) => doctor.id === form.doctor_id)) {
            nextErrors.attending_doctor = "Select a registered doctor from the list.";
        }
        if (!form.room_id) nextErrors.room_id = "Room is required.";
        if (!form.bed_id) nextErrors.bed_id = "Bed assignment is required.";
        if (!form.payer_type) nextErrors.payer_type = "Payer type is required.";
        if (!form.estimated_stay_days || Number.isNaN(Number(form.estimated_stay_days))) {
            nextErrors.estimated_stay_days = "Estimated stay is required.";
        } else if (Number(form.estimated_stay_days) <= 0 || Number(form.estimated_stay_days) > 60) {
            nextErrors.estimated_stay_days = "Estimated stay must be between 1 and 60 days.";
        }
        if (!form.priority) nextErrors.priority = "Priority is required.";

        if (scopedDepartment && form.department !== scopedDepartment) {
            nextErrors.department = "You can only admit patients in your department.";
        }

        const selectedRoomForValidation = rooms.find((room) => room.id === form.room_id);
        if (selectedRoomForValidation && form.bed_id) {
            const selectedBedForValidation = selectedRoomForValidation.beds.find(
                (bed) => bed.id === form.bed_id,
            );
            if (!selectedBedForValidation) {
                nextErrors.bed_id = "Selected bed no longer exists.";
            } else if (selectedBedForValidation.status !== "available") {
                nextErrors.bed_id = "Selected bed is occupied. Choose another bed.";
            }
        }

        return nextErrors;
    }

    async function handleCreateAdmission(event) {
        event.preventDefault();
        if (!canCreateAdmission) {
            return;
        }

        setBanner(null);
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setSaving(true);
        try {
            const selectedRoomForPayload = rooms.find((room) => room.id === form.room_id);
            const resolvedDepartment =
                form.department || selectedRoomForPayload?.department || "";
            const normalizedPatientId =
                form.patient_id && !Number.isNaN(Number(form.patient_id))
                    ? Number(form.patient_id)
                    : undefined;
            const normalizedDoctorId =
                form.doctor_id && !Number.isNaN(Number(form.doctor_id))
                    ? Number(form.doctor_id)
                    : undefined;

            await roomAdmissionService.createAdmission({
                ...form,
                patient_id: normalizedPatientId,
                doctor_id: normalizedDoctorId,
                department: resolvedDepartment,
                actor: currentUser?.name || currentUser?.admin_role || "Admin",
            });

            setForm(createInitialForm(scopedDepartment));
            setPatientMatchState(null);
            setAutoFilledPatientProfile(EMPTY_AUTO_FILLED_PATIENT_PROFILE);
            setErrors({});
            setPage(1);
            await refreshAdmissionContext({ targetPage: 1 });
            setBanner({
                type: "success",
                message: "Room admission created successfully. Bed inventory has been updated.",
            });
        } catch (error) {
            setBanner({
                type: "error",
                message: error?.message || "Failed to create admission. Please try again.",
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleStatusUpdate(admissionId, nextStatus, note) {
        if (!canCreateAdmission) {
            return;
        }

        setBusyKey(`${admissionId}:${nextStatus}`);
        setBanner(null);

        try {
            await roomAdmissionService.updateAdmissionStatus({
                admissionId,
                status: nextStatus,
                actor: currentUser?.name || currentUser?.admin_role || "Admin",
                note,
            });

            await refreshAdmissionContext();
            setBanner({
                type: "success",
                message: `Admission ${admissionId} updated to ${nextStatus}.`,
            });
        } catch (error) {
            setBanner({
                type: "error",
                message: error?.message || "Unable to update admission status.",
            });
        } finally {
            setBusyKey("");
        }
    }

    async function handleTransferSubmit(event) {
        event.preventDefault();

        if (!canCreateAdmission || !selectedAdmission) {
            return;
        }

        if (!transferDraft.room_id || !transferDraft.bed_id) {
            setBanner({
                type: "error",
                message: "Select both transfer room and bed.",
            });
            return;
        }

        setBusyKey(`${selectedAdmission.id}:transfer`);
        setBanner(null);

        try {
            await roomAdmissionService.transferAdmissionBed({
                admissionId: selectedAdmission.id,
                roomId: transferDraft.room_id,
                bedId: transferDraft.bed_id,
                actor: currentUser?.name || currentUser?.admin_role || "Admin",
                note: transferDraft.note.trim(),
            });

            await refreshAdmissionContext();
            setTransferDraft({ room_id: "", bed_id: "", note: "" });
            setBanner({
                type: "success",
                message: `Admission ${selectedAdmission.id} transferred successfully.`,
            });
        } catch (error) {
            setBanner({
                type: "error",
                message: error?.message || "Transfer failed. Please retry.",
            });
        } finally {
            setBusyKey("");
        }
    }

    async function handleAddNote() {
        if (!selectedAdmission || !noteDraft.trim()) {
            return;
        }

        setBusyKey(`${selectedAdmission.id}:note`);

        try {
            await roomAdmissionService.addProgressNote({
                admissionId: selectedAdmission.id,
                note: noteDraft.trim(),
                actor: currentUser?.name || currentUser?.admin_role || "Admin",
            });

            await refreshAdmissionContext();
            setNoteDraft("");
        } catch (error) {
            setBanner({
                type: "error",
                message: error?.message || "Unable to save note.",
            });
        } finally {
            setBusyKey("");
        }
    }

    return (
        <div className="min-h-screen bg-[#eff6ff] px-4 sm:px-8 lg:px-12 py-8">
            <Motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-slate-800">Room Admission Desk</h1>
                <p className="text-slate-500 mt-2 max-w-3xl">
                    Professional admission workflow for bed assignment, occupancy tracking,
                    and patient transfer lifecycle.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                        Signed in as {currentUser?.admin_role || "Admin"}
                    </span>
                    <span
                        className={`px-3 py-1 rounded-full border ${
                            canCreateAdmission
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                        }`}
                    >
                        {canCreateAdmission
                            ? "Can create and manage admissions"
                            : "Read-only admission view"}
                    </span>
                </div>
            </Motion.div>

            {banner && (
                <Motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
                        banner.type === "error"
                            ? "bg-rose-50 border-rose-200 text-rose-700"
                            : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    }`}
                >
                    {banner.type === "error" ? (
                        <AlertCircle size={16} />
                    ) : (
                        <CheckCircle2 size={16} />
                    )}
                    {banner.message}
                </Motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
                <StatCard
                    title="Total Beds"
                    value={inventorySummary.totalBeds}
                    hint="Capacity across scoped wards"
                    icon={<BedDouble size={20} />}
                />
                <StatCard
                    title="Occupied Beds"
                    value={inventorySummary.occupiedBeds}
                    hint="Currently assigned beds"
                    icon={<ClipboardList size={20} />}
                />
                <StatCard
                    title="Available Beds"
                    value={inventorySummary.availableBeds}
                    hint="Ready for new admissions"
                    icon={<CheckCheck size={20} />}
                />
                <StatCard
                    title="Active Admissions"
                    value={inventorySummary.activeAdmissions}
                    hint="Admitted and transfer cases"
                    icon={<CalendarDays size={20} />}
                />
                <StatCard
                    title="Pending Admissions"
                    value={inventorySummary.pendingAdmissions}
                    hint="Awaiting final admit"
                    icon={<Clock3 size={20} />}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
                <Motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xl:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
                >
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                New Room Admission
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Intake, triage, and room/bed reservation.
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <UserPlus size={18} />
                        </div>
                    </div>

                    {!canCreateAdmission && (
                        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm flex items-start gap-2">
                            <ShieldAlert size={16} className="mt-0.5" />
                            Only Front Desk Admin and Super Admin can create room admissions.
                        </div>
                    )}

                    <form onSubmit={handleCreateAdmission} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <FormField
                                label="Patient Name"
                                icon={<UserCircle2 size={14} />}
                                error={errors.patient_name}
                            >
                                <input
                                    name="patient_name"
                                    value={form.patient_name}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission}
                                    list="admission-patient-directory"
                                    placeholder="e.g. Mehedi Hasan"
                                    className={baseInputClass(Boolean(errors.patient_name))}
                                />
                                {patientMatchState && (
                                    <p
                                        className={`text-xs mt-1 ${
                                            patientMatchState.type === "matched"
                                                ? "text-emerald-600"
                                                : "text-amber-600"
                                        }`}
                                    >
                                        {patientMatchState.message}
                                    </p>
                                )}
                            </FormField>

                            <FormField
                                label="Patient Age"
                                icon={<Info size={14} />}
                                error={errors.patient_age}
                            >
                                <input
                                    name="patient_age"
                                    value={form.patient_age}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission}
                                    type="number"
                                    min="0"
                                    max="120"
                                    placeholder="Age"
                                    className={baseInputClass(Boolean(errors.patient_age))}
                                />
                            </FormField>

                            <FormField
                                label="Gender"
                                icon={<Filter size={14} />}
                                error={errors.patient_gender}
                            >
                                <select
                                    name="patient_gender"
                                    value={form.patient_gender}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission}
                                    className={baseInputClass(Boolean(errors.patient_gender))}
                                >
                                    <option value="">Select gender</option>
                                    {GENDERS.map((gender) => (
                                        <option key={gender} value={gender}>
                                            {gender}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField
                                label="Contact Phone"
                                icon={<Phone size={14} />}
                                error={errors.contact_phone}
                            >
                                <input
                                    name="contact_phone"
                                    value={form.contact_phone}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission}
                                    placeholder="+8801XXXXXXXXX"
                                    className={baseInputClass(Boolean(errors.contact_phone))}
                                />
                            </FormField>

                            <FormField
                                label="Emergency Contact Name"
                                icon={<UserCircle2 size={14} />}
                                error={errors.emergency_contact_name}
                            >
                                <input
                                    name="emergency_contact_name"
                                    value={form.emergency_contact_name}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission}
                                    placeholder="Relative / Guardian"
                                    className={baseInputClass(Boolean(errors.emergency_contact_name))}
                                />
                            </FormField>

                            <FormField
                                label="Emergency Contact Phone"
                                icon={<Phone size={14} />}
                                error={errors.emergency_contact_phone}
                            >
                                <input
                                    name="emergency_contact_phone"
                                    value={form.emergency_contact_phone}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission}
                                    placeholder="+8801XXXXXXXXX"
                                    className={baseInputClass(Boolean(errors.emergency_contact_phone))}
                                />
                            </FormField>

                            <FormField
                                label="Admission Type"
                                icon={<ClipboardList size={14} />}
                                error={errors.admission_type}
                            >
                                <select
                                    name="admission_type"
                                    value={form.admission_type}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission}
                                    className={baseInputClass(Boolean(errors.admission_type))}
                                >
                                    <option value="">Select admission type</option>
                                    {ADMISSION_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField
                                label={
                                    isFrontDeskAdmin
                                        ? "Department (optional)"
                                        : "Department"
                                }
                                icon={<Building2 size={14} />}
                                error={errors.department}
                            >
                                <select
                                    name="department"
                                    value={form.department}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission || Boolean(scopedDepartment)}
                                    className={baseInputClass(Boolean(errors.department))}
                                >
                                    <option value="">Select department</option>
                                    {departmentOptions.map((department) => (
                                        <option key={department} value={department}>
                                            {department}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField
                                label="Attending Doctor"
                                icon={<Stethoscope size={14} />}
                                error={errors.attending_doctor}
                            >
                                <select
                                    name="doctor_id"
                                    value={form.doctor_id}
                                    onChange={handleFormChange}
                                    disabled={
                                        !canCreateAdmission ||
                                        (!form.department && !isFrontDeskAdmin)
                                    }
                                    className={baseInputClass(Boolean(errors.attending_doctor))}
                                >
                                    <option value="">Select attending doctor</option>
                                    {doctorsForDepartment.map((doctor) => (
                                        <option
                                            key={doctor.id || `${doctor.name}-${doctor.department}`}
                                            value={doctor.id}
                                        >
                                            {doctor.name}
                                            {doctor.specialization
                                                ? ` (${doctor.specialization})`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField
                                label="Room"
                                icon={<Building2 size={14} />}
                                error={errors.room_id}
                            >
                                <select
                                    name="room_id"
                                    value={form.room_id}
                                    onChange={handleFormChange}
                                    disabled={
                                        !canCreateAdmission ||
                                        (!form.department && !isFrontDeskAdmin)
                                    }
                                    className={baseInputClass(Boolean(errors.room_id))}
                                >
                                    <option value="">Select room</option>
                                    {roomOptions.map((room) => (
                                        <option key={room.id} value={room.id}>
                                            {room.roomNumber} ({room.roomType})
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField
                                label="Bed"
                                icon={<BedDouble size={14} />}
                                error={errors.bed_id}
                            >
                                <select
                                    name="bed_id"
                                    value={form.bed_id}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission || !form.room_id}
                                    className={baseInputClass(Boolean(errors.bed_id))}
                                >
                                    <option value="">Select bed</option>
                                    {availableBeds.map((bed) => (
                                        <option key={bed.id} value={bed.id}>
                                            {bed.label} - Available
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField
                                label="Payer Type"
                                icon={<Landmark size={14} />}
                                error={errors.payer_type}
                            >
                                <select
                                    name="payer_type"
                                    value={form.payer_type}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission}
                                    className={baseInputClass(Boolean(errors.payer_type))}
                                >
                                    <option value="">Select payer type</option>
                                    {PAYER_TYPES.map((payer) => (
                                        <option key={payer} value={payer}>
                                            {payer}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField
                                label="Estimated Stay (Days)"
                                icon={<CalendarDays size={14} />}
                                error={errors.estimated_stay_days}
                            >
                                <input
                                    name="estimated_stay_days"
                                    value={form.estimated_stay_days}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission}
                                    type="number"
                                    min="1"
                                    max="60"
                                    placeholder="e.g. 3"
                                    className={baseInputClass(Boolean(errors.estimated_stay_days))}
                                />
                            </FormField>

                            <FormField
                                label="Priority"
                                icon={<ShieldAlert size={14} />}
                                error={errors.priority}
                            >
                                <select
                                    name="priority"
                                    value={form.priority}
                                    onChange={handleFormChange}
                                    disabled={!canCreateAdmission}
                                    className={baseInputClass(Boolean(errors.priority))}
                                >
                                    <option value="">Select priority</option>
                                    {PRIORITIES.map((priority) => (
                                        <option key={priority} value={priority}>
                                            {priority}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                        </div>

                        <datalist id="admission-patient-directory">
                            {patientNameOptions.map((patient) => (
                                <option
                                    key={`${patient.id}-${patient.user_id}`}
                                    value={patient.name}
                                    label={`${patient.phone || "No phone"} • ${patient.email}`}
                                />
                            ))}
                        </datalist>

                        <FormField
                            label="Admission Notes"
                            icon={<FileText size={14} />}
                            error={errors.notes}
                        >
                            <textarea
                                name="notes"
                                value={form.notes}
                                onChange={handleFormChange}
                                disabled={!canCreateAdmission}
                                rows={3}
                                placeholder="Clinical context or logistics notes"
                                className={`${baseInputClass(Boolean(errors.notes))} resize-none`}
                            />
                        </FormField>

                        {form.room_id && availableBeds.length === 0 && (
                            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm">
                                All beds in this room are occupied. Select another room.
                            </div>
                        )}

                        <div className="pt-1">
                            <Motion.button
                                type="submit"
                                whileHover={{ scale: canCreateAdmission && !saving ? 1.02 : 1 }}
                                whileTap={{ scale: canCreateAdmission && !saving ? 0.98 : 1 }}
                                disabled={!canCreateAdmission || saving}
                                className="w-full rounded-xl px-5 py-2.5 text-white font-semibold text-sm bg-[#127fec] hover:bg-[#0a5bbf] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Creating admission...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} />
                                        Create Room Admission
                                    </>
                                )}
                            </Motion.button>
                        </div>
                    </form>
                </Motion.div>

                <Motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xl:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
                >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                Admission Workflow Board
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Track transitions from pending to discharge and monitor occupancy.
                            </p>
                        </div>
                        <div className="text-xs text-slate-500 rounded-full px-3 py-1 border border-slate-200">
                            {statusCounts.all || 0} admissions in scope
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {STATUS_FILTERS.map((status) => {
                            const isActive = statusFilter === status;
                            const count =
                                status === "all"
                                    ? statusCounts.all || 0
                                    : statusCounts[status] || 0;
                            const label =
                                status === "all"
                                    ? "All"
                                    : STATUS_META[status]?.label || status;

                            return (
                                <button
                                    key={status}
                                    onClick={() => {
                                        setStatusFilter(status);
                                        setPage(1);
                                    }}
                                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                                        isActive
                                            ? "border-blue-300 bg-blue-50"
                                            : "border-slate-200 hover:border-blue-200"
                                    }`}
                                >
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                                        {label}
                                    </p>
                                    <p className="text-xl font-bold text-slate-800 mt-1">{count}</p>
                                </button>
                            );
                        })}
                    </div>
                </Motion.div>
            </div>

            <Motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
            >
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Admission Register
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Search, filter, and action room admission records.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3 w-full xl:w-auto">
                        <div className="relative sm:min-w-[260px]">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={searchTerm}
                                onChange={(event) => {
                                    setSearchTerm(event.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by patient, admission, room"
                                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </div>

                        <div className="relative sm:min-w-[170px]">
                            <Filter
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <select
                                value={departmentFilter}
                                onChange={(event) => {
                                    setDepartmentFilter(event.target.value);
                                    setPage(1);
                                }}
                                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                                <option value="all">All Departments</option>
                                {departmentOptions.map((department) => (
                                    <option key={department} value={department}>
                                        {department}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                            className="rounded-xl border border-slate-200 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            {STATUS_FILTERS.map((status) => (
                                <option key={status} value={status}>
                                    {status === "all"
                                        ? "All Status"
                                        : STATUS_META[status]?.label || status}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 size={18} className="animate-spin" />
                        Loading admission register...
                    </div>
                ) : admissions.length === 0 ? (
                    <div className="py-14 text-center text-slate-400 text-sm">
                        No admission records match your filters.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="text-left py-3 px-3">Admission</th>
                                        <th className="text-left py-3 px-3">Patient</th>
                                        <th className="text-left py-3 px-3">Department</th>
                                        <th className="text-left py-3 px-3">Room / Bed</th>
                                        <th className="text-left py-3 px-3">Doctor</th>
                                        <th className="text-left py-3 px-3">Status</th>
                                        <th className="text-left py-3 px-3">Priority</th>
                                        <th className="text-left py-3 px-3">Updated</th>
                                        <th className="text-left py-3 px-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admissions.map((admission) => {
                                        const canAdmit = admission.status === "pending";
                                        const canDischarge = ["admitted", "transfer"].includes(
                                            admission.status,
                                        );

                                        return (
                                            <tr
                                                key={admission.id}
                                                className="border-b last:border-b-0 hover:bg-slate-50"
                                            >
                                                <td className="py-3 px-3 font-semibold text-slate-700">
                                                    {admission.admission_no}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <p className="font-medium text-slate-700">
                                                        {admission.patient_name}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-3">{admission.department}</td>
                                                <td className="py-3 px-3">
                                                    <p className="text-slate-700">{admission.room_number}</p>
                                                    <p className="text-xs text-slate-500">
                                                        Bed {admission.bed_label}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-3">{admission.attending_doctor}</td>
                                                <td className="py-3 px-3">
                                                    <StatusChip status={admission.status} />
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                                                        {admission.priority}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-xs text-slate-500">
                                                    {formatDateTime(admission.updated_at)}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setSelectedAdmissionId(admission.id)}
                                                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700 text-xs"
                                                        >
                                                            Details
                                                        </button>

                                                        {canCreateAdmission && canAdmit && (
                                                            <button
                                                                onClick={() =>
                                                                    handleStatusUpdate(
                                                                        admission.id,
                                                                        "admitted",
                                                                        "Patient moved to active admitted status.",
                                                                    )
                                                                }
                                                                disabled={
                                                                    busyKey === `${admission.id}:admitted`
                                                                }
                                                                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs disabled:opacity-60"
                                                            >
                                                                {busyKey === `${admission.id}:admitted`
                                                                    ? "..."
                                                                    : "Admit"}
                                                            </button>
                                                        )}

                                                        {canCreateAdmission && canDischarge && (
                                                            <button
                                                                onClick={() =>
                                                                    handleStatusUpdate(
                                                                        admission.id,
                                                                        "discharged",
                                                                        "Patient discharge completed and bed released.",
                                                                    )
                                                                }
                                                                disabled={
                                                                    busyKey === `${admission.id}:discharged`
                                                                }
                                                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs disabled:opacity-60"
                                                            >
                                                                {busyKey === `${admission.id}:discharged`
                                                                    ? "..."
                                                                    : "Discharge"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-5">
                            <p className="text-xs text-slate-500">
                                Showing {admissionMeta.from || 0} - {admissionMeta.to || 0} of{" "}
                                {admissionMeta.total || 0}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    Prev
                                </button>
                                <span className="text-sm text-slate-600 font-medium">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() =>
                                        setPage((prev) => Math.min(totalPages, prev + 1))
                                    }
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </Motion.div>

            <AnimatePresence>
                {selectedAdmission && (
                    <>
                        <Motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/45 z-40"
                            onClick={() => setSelectedAdmissionId(null)}
                        />
                        <Motion.aside
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 210, damping: 26 }}
                            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col"
                        >
                            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        Admission Profile
                                    </p>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">
                                        {selectedAdmission.admission_no}
                                    </h3>
                                    <div className="mt-2">
                                        <StatusChip status={selectedAdmission.status} />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedAdmissionId(null)}
                                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs uppercase text-slate-500 mb-2">Patient</p>
                                        <p className="font-semibold text-slate-800">
                                            {selectedAdmission.patient_name}
                                        </p>
                                        <p className="text-slate-600 mt-1">
                                            {selectedAdmission.patient_age} years, {selectedAdmission.patient_gender}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs uppercase text-slate-500 mb-2">
                                            Room Allocation
                                        </p>
                                        <p className="font-semibold text-slate-800">
                                            {selectedAdmission.room_number} / Bed {selectedAdmission.bed_label}
                                        </p>
                                        <p className="text-slate-600 mt-1">
                                            Department: {selectedAdmission.department}
                                        </p>
                                        <p className="text-slate-600 mt-1">
                                            Doctor: {selectedAdmission.attending_doctor}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
                                        <p className="text-xs uppercase text-slate-500 mb-2">Admission Details</p>
                                        <div className="grid sm:grid-cols-2 gap-2 text-slate-700">
                                            <p>Type: {selectedAdmission.admission_type}</p>
                                            <p>Payer: {selectedAdmission.payer_type}</p>
                                            <p>Priority: {selectedAdmission.priority}</p>
                                            <p>
                                                Estimated Stay: {selectedAdmission.estimated_stay_days} days
                                            </p>
                                            <p>
                                                Created: {formatDateTime(selectedAdmission.created_at)}
                                            </p>
                                            <p>
                                                Last Updated: {formatDateTime(selectedAdmission.updated_at)}
                                            </p>
                                        </div>
                                        {selectedAdmission.notes && (
                                            <p className="mt-3 text-slate-600">
                                                <span className="font-medium text-slate-700">Notes: </span>
                                                {selectedAdmission.notes}
                                            </p>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
                                        <p className="text-xs uppercase text-slate-500 mb-2">Emergency Contact</p>
                                        <p className="text-slate-700">
                                            {selectedAdmission.emergency_contact_name}
                                        </p>
                                        <p className="text-slate-600 mt-1">
                                            {selectedAdmission.emergency_contact_phone}
                                        </p>
                                    </div>
                                </div>

                                {canCreateAdmission && (
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <h4 className="font-semibold text-slate-800 mb-3">
                                            Operational Actions
                                        </h4>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {selectedAdmission.status === "pending" && (
                                                <button
                                                    onClick={() =>
                                                        handleStatusUpdate(
                                                            selectedAdmission.id,
                                                            "admitted",
                                                            "Patient marked as admitted from detail panel.",
                                                        )
                                                    }
                                                    disabled={busyKey === `${selectedAdmission.id}:admitted`}
                                                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium disabled:opacity-60"
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        <CheckCircle2 size={13} /> Admit
                                                    </span>
                                                </button>
                                            )}

                                            {["admitted", "transfer"].includes(
                                                selectedAdmission.status,
                                            ) && (
                                                <button
                                                    onClick={() =>
                                                        handleStatusUpdate(
                                                            selectedAdmission.id,
                                                            "discharged",
                                                            "Patient discharged from detail panel.",
                                                        )
                                                    }
                                                    disabled={busyKey === `${selectedAdmission.id}:discharged`}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium disabled:opacity-60"
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        <CheckCheck size={13} /> Discharge
                                                    </span>
                                                </button>
                                            )}

                                            {["pending", "admitted", "transfer"].includes(
                                                selectedAdmission.status,
                                            ) && (
                                                <button
                                                    onClick={() =>
                                                        handleStatusUpdate(
                                                            selectedAdmission.id,
                                                            "cancelled",
                                                            "Admission cancelled after review.",
                                                        )
                                                    }
                                                    disabled={busyKey === `${selectedAdmission.id}:cancelled`}
                                                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium disabled:opacity-60"
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        <XCircle size={13} /> Cancel
                                                    </span>
                                                </button>
                                            )}
                                        </div>

                                        {["pending", "admitted", "transfer"].includes(
                                            selectedAdmission.status,
                                        ) && (
                                            <form
                                                onSubmit={handleTransferSubmit}
                                                className="rounded-xl bg-slate-50 border border-slate-200 p-3"
                                            >
                                                <p className="text-xs font-semibold text-slate-700 mb-2 inline-flex items-center gap-1">
                                                    <ArrowRightLeft size={13} /> Transfer Bed
                                                </p>
                                                <div className="grid sm:grid-cols-2 gap-3">
                                                    <select
                                                        value={transferDraft.room_id}
                                                        onChange={(event) =>
                                                            setTransferDraft((prev) => ({
                                                                ...prev,
                                                                room_id: event.target.value,
                                                                bed_id: "",
                                                            }))
                                                        }
                                                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                                    >
                                                        <option value="">Select transfer room</option>
                                                        {transferRoomOptions.map((room) => (
                                                            <option key={room.id} value={room.id}>
                                                                {room.roomNumber} ({room.roomType})
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <select
                                                        value={transferDraft.bed_id}
                                                        onChange={(event) =>
                                                            setTransferDraft((prev) => ({
                                                                ...prev,
                                                                bed_id: event.target.value,
                                                            }))
                                                        }
                                                        disabled={!transferDraft.room_id}
                                                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                                    >
                                                        <option value="">Select transfer bed</option>
                                                        {transferBedOptions.map((bed) => (
                                                            <option key={bed.id} value={bed.id}>
                                                                {bed.label} - Available
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    value={transferDraft.note}
                                                    onChange={(event) =>
                                                        setTransferDraft((prev) => ({
                                                            ...prev,
                                                            note: event.target.value,
                                                        }))
                                                    }
                                                    className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none"
                                                    placeholder="Transfer reason"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={busyKey === `${selectedAdmission.id}:transfer`}
                                                    className="mt-3 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium disabled:opacity-60"
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        <ArrowRightLeft size={13} /> Confirm Transfer
                                                    </span>
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                )}

                                <div className="rounded-xl border border-slate-200 p-4">
                                    <h4 className="font-semibold text-slate-800 mb-3 inline-flex items-center gap-1">
                                        <NotebookPen size={14} /> Timeline & Notes
                                    </h4>

                                    <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
                                        {[...(selectedAdmission.timeline || [])]
                                            .sort((a, b) => {
                                                return (
                                                    new Date(b.timestamp).getTime() -
                                                    new Date(a.timestamp).getTime()
                                                );
                                            })
                                            .map((event) => (
                                                <div
                                                    key={event.id}
                                                    className="rounded-lg border border-slate-200 px-3 py-2"
                                                >
                                                    <p className="text-sm font-medium text-slate-800">
                                                        {event.action}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {event.note}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 mt-1">
                                                        {event.actor} • {formatDateTime(event.timestamp)}
                                                    </p>
                                                </div>
                                            ))}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            value={noteDraft}
                                            onChange={(event) => setNoteDraft(event.target.value)}
                                            placeholder="Add progress note"
                                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        />
                                        <button
                                            onClick={handleAddNote}
                                            disabled={
                                                !noteDraft.trim() ||
                                                busyKey === `${selectedAdmission.id}:note`
                                            }
                                            className="px-3 py-2 rounded-lg bg-[#127fec] text-white text-sm font-medium disabled:opacity-60"
                                        >
                                            Save Note
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
