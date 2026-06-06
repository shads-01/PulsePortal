import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEcho } from '../utils/echo';
import notificationService from '../api/notificationService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const channelRef = useRef(null);
    const tokenRef = useRef(null);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const getCurrentUser = () => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    };

    /** Build a role-aware nav link from a notification type */
    const getLinkForType = (type, role) => {
        if (role === 'admin') return '/admin/all-appointments';
        if (type === 'confirmed_doctor') return '/doctor/appointments';
        return '/patient/appointments';
    };

    /** Map a DB notification row to our UI shape */
    const dbRowToNotif = (row) => ({
        id:             row.id,
        title:          row.title,
        message:        row.message,
        time:           row.time,           // "2 minutes ago" from diffForHumans
        type:           row.type,
        appointmentId:  row.appointment_id,
        link:           row.link,
        is_read:        row.is_read,
    });

    /** Build a notification object from a real-time WebSocket payload */
    const buildRealtimeNotif = useCallback((data, type) => {
        const user = getCurrentUser();
        const role = user?.role || 'patient';
        let link = getLinkForType(type, role);
        const appointmentId = data.id || data.appointment_id || null;

        let title = 'Appointment Updated';
        if (type === 'request')           title = 'New Appointment Request';
        if (type === 'confirmed_doctor')  title = 'New Appointment Confirmed';
        if (type === 'consultation') {
            title = 'Consultation Started';
            link = `/patient/consultation/${appointmentId}`;
        }

        return {
            id:            `rt_${Date.now()}_${Math.random()}`,  // temp ID until refresh
            title,
            message:        data.message,
            time:           'just now',
            type,
            appointmentId,
            link,
            is_read:        false,
        };
    }, []);

    // ─── Load stored notifications from API ───────────────────────────────────

    const loadStoredNotifications = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const rows = await notificationService.getNotifications();
            const mapped = rows.map(dbRowToNotif);
            setNotifications(mapped);
            setUnreadCount(mapped.filter(n => !n.is_read).length);
        } catch {
            // Silently ignore – user may have just logged out
        }
    }, []);

    // ─── Add a single real-time notification to the top of the list ───────────

    const addRealtimeNotification = useCallback((notif) => {
        setNotifications(prev => [notif, ...prev].slice(0, 30));
        setUnreadCount(prev => prev + 1);

        // Native browser notification (if user granted permission)
        if (typeof window !== 'undefined' && Notification.permission === 'granted') {
            new Notification(notif.title, { body: notif.message });
        }
    }, []);

    // ─── WebSocket subscription ───────────────────────────────────────────────

    const subscribe = useCallback(() => {
        const token    = localStorage.getItem('token');
        const userRaw  = localStorage.getItem('user');

        // No credentials → clear state and tear down
        if (!token || !userRaw) {
            if (channelRef.current) {
                try {
                    channelRef.current.stopListening('.appointment.requested');
                    channelRef.current.stopListening('.appointment.status.updated');
                    channelRef.current.stopListening('.appointment.confirmed_for_doctor');
                    channelRef.current.stopListening('.consultation.started');
                } catch (_) {}
                channelRef.current = null;
            }
            if (tokenRef.current) {
                // User just logged out – clear state
                setNotifications([]);
                setUnreadCount(0);
                tokenRef.current = null;
            }
            return;
        }

        // Token changed (new login) → reload from DB and re-subscribe
        if (token !== tokenRef.current) {
            // Tear down old channel first
            if (channelRef.current) {
                try {
                    channelRef.current.stopListening('.appointment.requested');
                    channelRef.current.stopListening('.appointment.status.updated');
                    channelRef.current.stopListening('.appointment.confirmed_for_doctor');
                    channelRef.current.stopListening('.consultation.started');
                } catch (_) {}
                channelRef.current = null;
            }

            tokenRef.current = token;

            // Fetch persisted notifications from the database
            loadStoredNotifications();

            const user = (() => { try { return JSON.parse(userRaw); } catch { return null; } })();
            if (!user?.id) return;

            const echo    = getEcho(token);
            const channel = echo.private(`user.${user.id}`);
            channelRef.current = channel;

            channel.listen('.appointment.requested', (data) => {
                addRealtimeNotification(buildRealtimeNotif(data, 'request'));
            });

            channel.listen('.appointment.status.updated', (data) => {
                addRealtimeNotification(buildRealtimeNotif(data, 'status'));
            });

            channel.listen('.appointment.confirmed_for_doctor', (data) => {
                addRealtimeNotification(buildRealtimeNotif(data, 'confirmed_doctor'));
            });

            channel.listen('.consultation.started', (data) => {
                addRealtimeNotification(buildRealtimeNotif(data, 'consultation'));
            });
        }
    }, [loadStoredNotifications, addRealtimeNotification, buildRealtimeNotif]);

    // Poll every 2 s – lightweight, only acts when token changes
    useEffect(() => {
        subscribe();
        const interval = setInterval(subscribe, 2000);

        return () => {
            clearInterval(interval);
            if (channelRef.current) {
                try {
                    channelRef.current.stopListening('.appointment.requested');
                    channelRef.current.stopListening('.appointment.status.updated');
                    channelRef.current.stopListening('.appointment.confirmed_for_doctor');
                    channelRef.current.stopListening('.consultation.started');
                } catch (_) {}
            }
        };
    }, [subscribe]);

    // ─── Mark all as read ─────────────────────────────────────────────────────

    const markAsRead = useCallback(async () => {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        try {
            await notificationService.markAllRead();
        } catch {
            // Best-effort — UI already updated
        }
    }, []);

    // ─── Navigate on click ────────────────────────────────────────────────────

    const handleNotificationClick = useCallback((notif) => {
        if (notif.link) {
            navigate(notif.link, { state: { highlight: notif.appointmentId } });
        }
    }, [navigate]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            handleNotificationClick,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);