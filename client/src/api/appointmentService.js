import api from "./axios";

const appointmentService = {
    // Fetch all available doctors
    getDoctors: async () => {
        const response = await api.get("/doctor/available");
        return response.data.data;
    },

    // Patient books an appointment
    bookAppointment: async (data) => {
        const response = await api.post("/patient/appointments", data);
        return response.data.data;
    },

    // Get booked slots for a specific doctor on a specific date
    getBookedSlots: async (doctorId, date) => {
        const response = await api.get(`/patient/appointments/booked-slots?doctor_id=${doctorId}&date=${date}`);
        return response.data.data;
    },

    // Patient fetches their own appointments
    getPatientAppointments: async () => {
        const response = await api.get("/patient/appointments");
        return response.data.data;
    },

    // Patient cancels an appointment
    cancelAppointment: async (id) => {
        const response = await api.patch(`/patient/appointments/${id}/cancel`);
        return response.data.data;
    },

    // Doctor fetches their appointments
    getDoctorAppointments: async () => {
        const response = await api.get("/doctor/appointments");
        return response.data.data;
    },

    // Doctor searches medicine suggestions while typing prescription
    getMedicineSuggestions: async (query) => {
        const response = await api.get("/doctor/medicines/suggestions", {
            params: { q: query },
        });
        return response.data.data || [];
    },

    // Doctor updates appointment status
    updateAppointmentStatus: async (id, status) => {
        const response = await api.patch(`/doctor/appointments/${id}/status`, {
            status,
        });
        return response.data.data;
    },

    // Doctor uploads a prescription for an appointment (also marks it completed)
    uploadPrescription: async (appointmentId, data) => {
        const response = await api.post(`/doctor/appointments/${appointmentId}/prescription`, data);
        return response.data;
    },

    // Doctor retrieves printable prescription PDF for an appointment
    getDoctorPrescriptionPdf: async (appointmentId) => {
        const response = await api.get(`/doctor/appointments/${appointmentId}/prescription/pdf`, {
            responseType: "blob",
        });
        return response.data;
    },

    // Patient retrieves their prescription for a completed appointment
    getPatientPrescription: async (appointmentId) => {
        const response = await api.get(`/patient/appointments/${appointmentId}/prescription`);
        return response.data.data;
    },

    // Patient downloads prescription PDF for an appointment
    getPatientPrescriptionPdf: async (appointmentId) => {
        const response = await api.get(`/patient/appointments/${appointmentId}/prescription/pdf`, {
            responseType: "blob",
        });
        return response.data;
    },
};

export default appointmentService;
