import api from './axios';

const authService = {
    register: async (name, email, password) => {
        const response = await api.post('/auth/register', {
            name,
            email,
            password,
            password_confirmation: password,
        });
        const { token, user } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return user;
    },

    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return user; // caller reads user.role to redirect
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    },

    getProfile: async () => {
        const response = await api.get('/profile');
        return response.data.data;
    },

    editProfile: async (profileData) => {
        const response = await api.put('/profile', profileData);
        
        // If the backend returns the updated user object, refresh local storage
        if (response.data?.data?.user) {
            const currentUser = JSON.parse(localStorage.getItem('user')) || {};
            const updatedUser = { ...currentUser, ...response.data.data.user };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        return response.data;
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isLoggedIn: () => {
        return !!localStorage.getItem('token');
    },
};

export default authService;