import api from "./axios";

const DEFAULT_STATUS_COUNTS = {
    all: 0,
    pending: 0,
    admitted: 0,
    transfer: 0,
    discharged: 0,
    cancelled: 0,
};

function parseApiError(error, fallbackMessage) {
    const apiMessage = error?.response?.data?.message;
    const apiErrors = error?.response?.data?.errors;

    if (apiErrors && typeof apiErrors === "object") {
        const firstFieldErrors = Object.values(apiErrors)[0];
        if (Array.isArray(firstFieldErrors) && firstFieldErrors.length > 0) {
            return firstFieldErrors[0];
        }
    }

    return apiMessage || fallbackMessage;
}

function normalizeAdmission(admission) {
    return {
        ...admission,
        id: String(admission.id),
        room_id: admission.room_id != null ? String(admission.room_id) : "",
        bed_id: admission.bed_id != null ? String(admission.bed_id) : "",
    };
}

function normalizeRoomInventory(rooms) {
    return (rooms || []).map((room) => ({
        ...room,
        id: String(room.id),
        beds: (room.beds || []).map((bed) => ({
            ...bed,
            id: String(bed.id),
            occupantAdmissionId:
                bed.occupantAdmissionId != null
                    ? String(bed.occupantAdmissionId)
                    : null,
        })),
    }));
}

function normalizeDoctors(doctors) {
    return (doctors || []).map((doctor) => ({
        ...doctor,
        id: doctor.id != null ? String(doctor.id) : "",
        user_id: doctor.user_id != null ? String(doctor.user_id) : "",
    }));
}

function normalizePatients(patients) {
    return (patients || []).map((patient) => ({
        ...patient,
        id: patient.id != null ? String(patient.id) : "",
        user_id: patient.user_id != null ? String(patient.user_id) : "",
        patient_id: patient.patient_id ||
            (patient.id != null
                ? `PT-${String(patient.id).padStart(5, "0")}`
                : ""),
        phone: patient.phone ? String(patient.phone) : "",
        emergency_contact: patient.emergency_contact || patient.emergency_contact_name || "",
        emergency_phone: patient.emergency_phone || patient.emergency_contact_phone || "",
    }));
}

function createDefaultMeta(perPage = 7) {
    return {
        current_page: 1,
        per_page: perPage,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0,
    };
}

function buildLegacyStatusCounts(items) {
    const counts = { ...DEFAULT_STATUS_COUNTS, all: items.length };

    items.forEach((item) => {
        const key = item.status;
        if (counts[key] !== undefined) {
            counts[key] += 1;
        }
    });

    return counts;
}

const roomAdmissionService = {
    getAdmissions: async (params = {}) => {
        try {
            const queryParams = Object.fromEntries(
                Object.entries(params).filter(([, value]) => {
                    return value !== undefined && value !== null && value !== "";
                }),
            );

            const response = await api.get("/admin/room-admissions", {
                params: queryParams,
            });

            const payload = response.data.data;

            if (Array.isArray(payload)) {
                const items = payload.map(normalizeAdmission);
                return {
                    items,
                    meta: createDefaultMeta(items.length || 7),
                    status_counts: buildLegacyStatusCounts(items),
                    filters: {
                        search: "",
                        status: "all",
                        department: "all",
                    },
                };
            }

            const items = (payload?.items || []).map(normalizeAdmission);

            return {
                items,
                meta: payload?.meta || createDefaultMeta(params?.per_page || 7),
                status_counts: {
                    ...DEFAULT_STATUS_COUNTS,
                    ...(payload?.status_counts || {}),
                },
                filters: payload?.filters || {
                    search: "",
                    status: "all",
                    department: "all",
                },
            };
        } catch (error) {
            throw new Error(
                parseApiError(error, "Unable to load admission records."),
            );
        }
    },

    getRoomInventory: async () => {
        try {
            const response = await api.get("/admin/room-admissions/rooms");
            return normalizeRoomInventory(response.data.data);
        } catch (error) {
            throw new Error(
                parseApiError(error, "Unable to load room inventory."),
            );
        }
    },

    getDepartments: async () => {
        try {
            const response = await api.get("/admin/room-admissions/departments");
            return response.data.data;
        } catch (error) {
            throw new Error(
                parseApiError(error, "Unable to load departments."),
            );
        }
    },

    getDoctors: async () => {
        try {
            const response = await api.get("/admin/doctors");
            return normalizeDoctors(response.data.data);
        } catch (error) {
            throw new Error(
                parseApiError(error, "Unable to load doctor directory."),
            );
        }
    },

    getPatients: async () => {
        try {
            const response = await api.get("/admin/patients");
            return normalizePatients(response.data.data);
        } catch (error) {
            throw new Error(
                parseApiError(error, "Unable to load patient directory."),
            );
        }
    },

    getPatientAdmissions: async () => {
        try {
            const response = await api.get("/patient/room-admissions");
            return (response.data.data || []).map(normalizeAdmission);
        } catch (error) {
            throw new Error(
                parseApiError(error, "Unable to load your room admission records."),
            );
        }
    },

    getDoctorAdmissions: async () => {
        try {
            const response = await api.get("/doctor/room-admissions");
            return (response.data.data || []).map(normalizeAdmission);
        } catch (error) {
            throw new Error(
                parseApiError(error, "Unable to load assigned room admissions."),
            );
        }
    },

    createAdmission: async (payload) => {
        try {
            const response = await api.post("/admin/room-admissions", payload);
            return normalizeAdmission(response.data.data);
        } catch (error) {
            throw new Error(
                parseApiError(error, "Failed to create room admission."),
            );
        }
    },

    updateAdmissionStatus: async ({ admissionId, status, actor, note }) => {
        try {
            const response = await api.patch(
                `/admin/room-admissions/${admissionId}/status`,
                {
                    status,
                    actor,
                    note,
                },
            );
            return normalizeAdmission(response.data.data);
        } catch (error) {
            throw new Error(
                parseApiError(error, "Unable to update admission status."),
            );
        }
    },

    transferAdmissionBed: async ({ admissionId, roomId, bedId, actor, note }) => {
        try {
            const response = await api.post(
                `/admin/room-admissions/${admissionId}/transfer`,
                {
                    room_id: roomId,
                    bed_id: bedId,
                    actor,
                    note,
                },
            );
            return normalizeAdmission(response.data.data);
        } catch (error) {
            throw new Error(
                parseApiError(error, "Unable to transfer admission."),
            );
        }
    },

    addProgressNote: async ({ admissionId, note, actor }) => {
        try {
            const response = await api.post(
                `/admin/room-admissions/${admissionId}/notes`,
                {
                    note,
                    actor,
                },
            );
            return normalizeAdmission(response.data.data);
        } catch (error) {
            throw new Error(
                parseApiError(error, "Unable to save progress note."),
            );
        }
    },
};

export default roomAdmissionService;
