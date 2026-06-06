import api from './axios';

const notificationService = {
    /**
     * Fetch all notifications for the authenticated user (newest first, max 20).
     */
    getNotifications: async () => {
        const { data } = await api.get('/notifications');
        return data; // array of notification objects
    },

    /**
     * Mark all of the current user's notifications as read.
     */
    markAllRead: async () => {
        await api.post('/notifications/mark-read');
    },

    /**
     * Delete a single notification by ID.
     */
    deleteNotification: async (id) => {
        await api.delete(`/notifications/${id}`);
    },
};

export default notificationService;
