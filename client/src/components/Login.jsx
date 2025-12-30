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
        <div className="flex items-center justify-center min-h-screen bg-black p-4 sm:p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#111,black)]" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-[90%] sm:max-w-md relative z-10"
            >
                <div className="text-center mb-8 sm:mb-10">
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl"
                    >
                        <Shield size={24} className="text-white sm:size-[32px]" strokeWidth={1.5} />
                    </motion.div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white mb-2 uppercase">
                        System Access
                    </h1>
                    <p className="text-muted text-[10px] protocol-text">Backrow Protocol v2.5.0</p>
                </div>

                <div className="glass-panel p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted protocol-text ml-1 uppercase">Username</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-white transition-colors" size={16} />
                                <input
                                    className="w-full bg-black/50 border border-white/5 rounded-xl sm:rounded-2xl pl-12 pr-4 py-3 sm:py-4 text-white placeholder:text-neutral-700 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all text-sm font-medium"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter username..."
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted protocol-text ml-1 uppercase">Password</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-white transition-colors" size={16} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full bg-black/50 border border-white/5 rounded-xl sm:rounded-2xl pl-12 pr-12 py-3 sm:py-4 text-white placeholder:text-neutral-700 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all text-sm font-medium tracking-widest"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
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
                                    className="text-red-400 text-[10px] text-center bg-red-500/5 py-3 rounded-xl border border-red-500/10 protocol-text"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            disabled={loading}
                            className="w-full bg-white text-black font-extrabold py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <span className="animate-pulse protocol-text">Verifying...</span>
                            ) : (
                                <>
                                    <span className="text-sm">Login</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-6 sm:mt-8 text-center text-muted text-[10px] protocol-text opacity-50">
                    Encrypted Connection. Backrow Release.
                </p>
            </motion.div>
        </div>
    );
}
