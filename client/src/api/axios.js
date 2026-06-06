import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
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
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isAuthRoute = originalRequest?.url?.includes("/auth/");

        if (error.response?.status === 401 && !isAuthRoute && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Manually call the refresh endpoint without circular dependency
                const rs = await axios.post((import.meta.env.VITE_API_URL || "http://localhost:8000/api") + '/auth/refresh', {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                
                const newToken = rs.data.data.token;
                localStorage.setItem("token", newToken);
                
                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                
                processQueue(null, newToken);
                return api(originalRequest);
            } catch (_error) {
                processQueue(_error, null);
                // Token refresh failed, handle logout
                if (api._onAuthError) {
                    api._onAuthError();
                } else {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/auth";
                }
                return Promise.reject(_error);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    },
);

export default api;
