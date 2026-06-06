import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import axios from 'axios';

window.Pusher = Pusher;

let echoInstance = null;
let currentToken = null;

/**
 * Returns an Echo instance authenticated with the given token.
 * Re-creates the instance whenever the token changes (login/logout).
 */
export function getEcho(token) {
    const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;

    if (!pusherKey) {
        console.warn('[PulsePortal] VITE_PUSHER_APP_KEY is not set – real-time notifications disabled.');
        return { private: () => ({ listen: () => ({}), stopListening: () => ({}) }) };
    }

    // Re-create if token changed or first call
    if (!echoInstance || currentToken !== token) {
        if (echoInstance) {
            try { echoInstance.disconnect(); } catch (_) {}
        }

        currentToken = token;
        echoInstance = new Echo({
            broadcaster: 'pusher',
            key: pusherKey,
            cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
            forceTLS: true,
            authEndpoint: (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
                .replace('/api', '') + '/broadcasting/auth',
            auth: {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            },
        });
    }

    return echoInstance;
}

// Default no-op export so any old import doesn't crash
export default { private: () => ({ listen: () => ({}), stopListening: () => ({}) }) };
