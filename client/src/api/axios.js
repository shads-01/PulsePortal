import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle expired tokens globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only redirect on 401 if we're NOT on an auth route
        // Otherwise login failures would cause infinite redirects
        const isAuthRoute = error.config?.url?.includes("/auth/");

        if (error.response?.status === 401 && !isAuthRoute) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/auth";
        }
        return Promise.reject(error);
    },
);

export default api;
