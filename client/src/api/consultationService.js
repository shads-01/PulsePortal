import api from "./axios";

const consultationService = {
    startConsultation: async (appointmentId) => {
        const response = await api.post(`/doctor/consultations/${appointmentId}/start`);
        return response.data.data;
    },
    endConsultation: async (appointmentId) => {
        const response = await api.post(`/doctor/consultations/${appointmentId}/end`);
        return response.data;
    },
    getPatientConsultation: async (appointmentId) => {
        const response = await api.get(`/patient/consultations/${appointmentId}`);
        return response.data; // { status: "success"|"waiting", data?: {room_name, started_at} }
    }
};

export default consultationService;
