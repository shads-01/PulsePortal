import api from "./axios";

const adminService = {
    // ── Doctor management ─────────────────────────────────────
    createDoctor: async (data) => {
        const response = await api.post("/admin/doctors", data);
        return response.data.data;
    },

    getDoctors: async () => {
        const response = await api.get("/admin/doctors");
        return response.data.data;
    },

    // ── Admin management ──────────────────────────────────────
    createAdmin: async (data) => {
        const response = await api.post("/admin/admins", data);
        return response.data.data;
    },

    // ── Overview data ─────────────────────────────────────────
    getPatients: async () => {
        const response = await api.get("/admin/patients");
        return response.data.data;
    },

    // All appointments — Super Admin only
    getAllAppointments: async () => {
        const response = await api.get("/admin/appointments");
        return response.data.data;
    },

    // Department-filtered appointments — any admin
    getDepartmentAppointments: async () => {
        const response = await api.get("/admin/department-appointments");
        return response.data.data;
    },

    // Update appointment status (confirm / cancel)
    updateAppointmentStatus: async (id, status) => {
        const response = await api.patch(`/admin/appointments/${id}/status`, { status });
        return response.data.data;
    },

    getStats: async () => {
        const response = await api.get("/admin/stats");
        return response.data.data;
    },

    // Get logged-in admin's profile (admin_role + department)
    getMe: async () => {
        const response = await api.get("/admin/me");
        return response.data.data;
    },
};

export default adminService;
