import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useStore } from './store';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './components/Login';
import Chat from './components/Chat';

export default function App() {
    const { user, isAuthenticated, setConnected, logout, login } = useStore();
    const socketRef = useRef(null);

    useEffect(() => {
        // Validation for legacy sessions (missing userId)
        if (isAuthenticated && user && !user.id) {
            console.log("Legacy session detected, forcing logout");
            logout();
            return;
        }

        // Auto-connect if authenticated
        if (isAuthenticated && user?.token && !socketRef.current) {
            const newSocket = io('/', {
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
            });

            newSocket.on('connect', () => {
                setConnected(true);
                // Emit join with userId and password for verification
                newSocket.emit('join', { userId: user.id, password: user.token });
            });

            newSocket.on('connect_error', (err) => {
                console.error('Connection error:', err);
            });

            newSocket.on('error', (err) => {
                console.error('Socket error:', err);
                if (err.includes('banned') || err.includes('suspended') || err.includes('Invalid')) {
                    logout();
                    alert(err);
                }
            });

            newSocket.on('disconnect', () => {
                setConnected(false);
            });

            socketRef.current = newSocket;
        } else if (!isAuthenticated && socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, [isAuthenticated, user, setConnected, logout]);

    // Clean up
    useEffect(() => {
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    return (
        <AnimatePresence mode="wait">
            {!isAuthenticated ? (
                <motion.div
                    key="login"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Login onLogin={login} />
                </motion.div>
            ) : (
                <motion.div
                    key="chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="h-screen"
                >
                    <Chat socket={socketRef.current} />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Git History Polish Step 1
// Git History Polish Step 2
// Git History Polish Step 3
// Git History Polish Step 4
// Git History Polish Step 5
// Git History Polish Step 6
// Git History Polish Step 7
// Git History Polish Step 8
// Git History Polish Step 9
// Git History Polish Step 10
// Git History Polish Step 11
// Git History Polish Step 12
// Git History Polish Step 13
// Git History Polish Step 14
// Git History Polish Step 15
// Git History Polish Step 16
// Git History Polish Step 17
// Git History Polish Step 18
// Git History Polish Step 19
// Git History Polish Step 20
// Git History Polish Step 21
// Git History Polish Step 22
// Git History Polish Step 23
// Git History Polish Step 24
// Git History Polish Step 25