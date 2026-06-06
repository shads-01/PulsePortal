import api from "./axios";

const aiService = {
    /**
     * Chat with the AI Health Assistant.
     * @param {string} message - User's message
     * @param {Array} history - Conversation history [{role: 'user'|'assistant', content: '...'}]
     * @returns {Promise<string>} AI response message
     */
    chatWithAssistant: async (message, history = []) => {
        const response = await api.post("/patient/ai/chat", {
            message,
            history,
        });
        return response.data.data.message;
    },

    /**
     * Suggest doctors based on symptoms.
     * @param {string} symptoms - Description of symptoms
     * @returns {Promise<{specializations: string[], explanation: string}>}
     */
    suggestDoctors: async (symptoms) => {
        const response = await api.post("/patient/ai/suggest-doctors", {
            symptoms,
        });
        return response.data.data;
    },

    /**
     * Generate AI clinical summary of a patient's medical history (doctor-side).
     * @param {number|string} patientId - The patient's ID
     * @returns {Promise<string>} AI-generated clinical summary
     */
    getPatientSummary: async (patientId) => {
        const response = await api.post(`/doctor/ai/patient-summary/${patientId}`);
        return response.data.data.summary;
    },

    /**
     * Generate AI prescription summary for a patient (patient-side).
     * @param {number|string} appointmentId - The appointment ID
     * @returns {Promise<string>} AI-generated prescription explanation
     */
    getPrescriptionSummary: async (appointmentId) => {
        const response = await api.post(`/patient/ai/prescription-summary/${appointmentId}`);
        return response.data.data.summary;
    },
};

export default aiService;
