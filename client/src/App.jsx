import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useStore } from './store';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './components/Login';
import Chat from './components/Chat';

export default function App() {
    const { user, isAuthenticated, setConnected, logout, login, addTopic, updateTopic, deleteTopic } = useStore();
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

            newSocket.on('newTopic', (topic) => {
                addTopic(topic);
            });

            newSocket.on('topicUpdated', (topic) => {
                updateTopic(topic);
            });

            newSocket.on('topicDeleted', ({ topicId }) => {
                deleteTopic(topicId);
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
