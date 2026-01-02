import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Terminal, ArrowRight, Eye, EyeOff, User } from 'lucide-react';

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: username.toLowerCase(), password })
            });
            const data = await res.json();

            if (res.ok) {
                onLogin({
                    userId: data.userId,
                    username: username.toLowerCase(),
                    token: password,
                    anonymousId: data.anonymousId,
                    role: data.role
                });
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Connection refused. Is the server online?');
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background-elevated to-background" />
            <div className="absolute inset-0 opacity-50">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-hover/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-[90%] sm:max-w-md relative z-10"
            >
                <div className="text-center mb-8 sm:mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="relative w-14 h-14 sm:w-18 sm:h-18 mx-auto mb-6"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent-hover rounded-2xl blur-md opacity-50" />
                        <div className="relative w-full h-full bg-gradient-to-br from-accent to-accent-hover border border-accent-light/20 rounded-2xl flex items-center justify-center shadow-glow">
                            <Shield size={28} className="text-white sm:size-[36px]" strokeWidth={2} />
                        </div>
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="text-3xl sm:text-4xl font-bold tracking-tight text-primary mb-2"
                    >
                        Welcome Back
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="text-secondary text-sm"
                    >
                        Sign in to continue to your workspace
                    </motion.p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="glass-panel p-6 sm:p-8 rounded-2xl border border-border shadow-card"
                >
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-secondary ml-1 uppercase tracking-wider">Username</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors duration-200" size={18} />
                                <input
                                    className="w-full bg-surface border border-border rounded-xl pl-12 pr-4 py-3 sm:py-4 text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm font-medium"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter username..."
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-secondary ml-1 uppercase tracking-wider">Password</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors duration-200" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full bg-surface border border-border rounded-xl pl-12 pr-12 py-3 sm:py-4 text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm font-medium"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors duration-200"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-error text-xs text-center bg-error/10 py-3 rounded-xl border border-error/20 font-medium"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-accent to-accent-hover text-white font-bold py-3 sm:py-4 rounded-xl hover:shadow-glow active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-accent-light to-accent-hover opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {loading ? (
                                <span className="animate-pulse relative z-10">Signing in...</span>
                            ) : (
                                <>
                                    <span className="text-sm font-semibold relative z-10">Sign In</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200 relative z-10" />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="mt-6 sm:mt-8 text-center text-muted text-xs opacity-60"
                >
                    Secured by end-to-end encryption
                </motion.p>
            </motion.div>
        </div>
    );
}
