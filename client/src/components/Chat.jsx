import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, LogOut, Zap, Search, Ban, Paperclip, Smile, Shield, Plus, Globe } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Chat({ socket }) {
    const { messages, addMessage, updateMessage, setMessages, user, logout, typingUsers, setTypingUsers, onlineCount } = useStore();
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setShouldAutoScroll(isAtBottom);
    };

    useEffect(() => {
        if (shouldAutoScroll) {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, shouldAutoScroll]);

    useEffect(() => {
        if (!socket) return;

        const { setOnlineCount } = useStore.getState();

        socket.on('messageHistory', (history) => {
            setMessages(history);
        });

        socket.on('receiveMessage', (msg) => {
            const currentUser = useStore.getState().user;
            if (String(msg.senderId) === String(currentUser?.anonymousId)) return;
            addMessage(msg);
        });

        socket.on('userTyping', ({ isTyping }) => {
            setTypingUsers(isTyping ? 1 : 0);
        });

        socket.on('system_message', (msg) => {
            addMessage({ ...msg, type: 'system', id: Date.now(), timestamp: new Date().toISOString() });
        });

        socket.on('userCount', (count) => {
            setOnlineCount(count);
        });

        return () => {
            socket.off('messageHistory');
            socket.off('receiveMessage');
            socket.off('userTyping');
            socket.off('system_message');
            socket.off('userCount');
        };
    }, [socket, addMessage, setMessages, setTypingUsers]);

    // Polyfill for random UUID in non-secure contexts
    const generateUUID = () => {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const handleSend = (e) => {
        e.preventDefault();
        const content = input.trim();
        if (!content) return;

        const tempId = generateUUID();
        const localMsg = {
            id: tempId,
            senderId: user?.anonymousId,
            content,
            timestamp: new Date().toISOString(),
            status: 'sending'
        };

        addMessage(localMsg);
        setInput('');
        handleTyping(false);

        socket.emit('sendMessage', { content, senderId: user?.anonymousId }, (ack) => {
            if (ack?.success) {
                updateMessage(tempId, { status: 'delivered', id: ack.id });
            } else if (ack?.error) {
                alert(ack.error);
                setMessages(useStore.getState().messages.filter(m => m.id !== tempId));
            }
        });
    };

    const handleTyping = (typing) => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        if (typing) {
            if (!isTyping) {
                setIsTyping(true);
                socket.emit('typing', true);
            }
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                socket.emit('typing', false);
            }, 2000);
        } else {
            setIsTyping(false);
            socket.emit('typing', false);
        }
    };

    useEffect(() => {
        const handleAdminClear = () => {
            socket?.emit('admin:clearChat');
        };
        window.addEventListener('admin:clearChat', handleAdminClear);
        return () => window.removeEventListener('admin:clearChat', handleAdminClear);
    }, [socket]);

    const handleBan = (targetId) => {
        if (confirm(`Are you sure you want to BAN User #${targetId}?`)) {
            socket?.emit('admin:banUser', { targetId, reason: 'Administrator discretion' });
        }
    };

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
            {/* Sidebar component */}
            <Sidebar />

            {/* Chat Area */}
            <div className="flex-1 flex flex-col relative min-w-0">
                {/* Chat Header */}
                <div className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-black/80 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#111] border border-[#1A1A1A] flex items-center justify-center text-white overflow-hidden relative shadow-lg">
                            <Globe size={20} />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-sm tracking-tight text-white">Global Group</h2>
                                <Shield size={12} className="text-[#444]" />
                            </div>
                            <p className="text-[10px] text-[#666] protocol-text flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                {onlineCount || 0} Online
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-[#666] hover:text-white hover:bg-[#111] rounded-lg transition-all">
                            <Search size={18} />
                        </button>
                    </div>
                </div>

                {/* Messages Container */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scroll-smooth bg-[radial-gradient(circle_at_center,#050505,black)]"
                >
                    <div className="flex flex-col items-center justify-center py-8 opacity-40 select-none">
                        <div className="px-3 py-1 bg-[#111] border border-[#1A1A1A] rounded-full text-[9px] protocol-text mb-3 text-[#555]">
                            Encrypted Channel
                        </div>
                        <p className="text-[10px] text-center max-w-xs text-[#444]">
                            Messages are end-to-end encrypted. Your identity is hidden as <span className="text-white font-mono">Anonymous User #{user?.anonymousId || '????'}</span>.
                        </p>
                    </div>

                    <AnimatePresence initial={false}>
                        {messages.map((msg) => {
                            // Compare with persistent numeric ID (coerced to string for safety)
                            const isMe = String(msg.senderId) === String(user?.anonymousId);
                            const isSystem = msg.type === 'system';
                            const isSending = msg.status === 'sending';

                            return (
                                <motion.div
                                    key={msg.id}
                                    layout="position"
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 40,
                                        mass: 0.8
                                    }}
                                    className={`flex ${isSystem ? 'justify-center' : (isMe ? 'justify-end' : 'justify-start')}`}
                                >
                                    {isSystem ? (
                                        <div className="bg-[#111] border border-[#1A1A1A] px-3 py-1 rounded-full">
                                            <span className="text-[10px] text-[#555] protocol-text">{msg.content}</span>
                                        </div>
                                    ) : (
                                        <div className={`max-w-[75%] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-[10px] font-bold text-[#666] protocol-text hover:text-white transition-colors cursor-default">
                                                    {isMe ? 'You' : `Anonymous User #${msg.senderId || 'Unknown'}`}
                                                </span>
                                                {user?.role === 'admin' && !isMe && (
                                                    <button
                                                        onClick={() => handleBan(msg.senderId)}
                                                        className="text-[9px] text-red-500/50 hover:text-red-500 protocol-text opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        [STRIKE]
                                                    </button>
                                                )}
                                                <span className="text-[9px] text-[#333] protocol-text">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <div className={`
                                                px-5 py-3 rounded-2xl text-[14px] leading-relaxed relative shadow-md transition-all
                                                ${isMe
                                                    ? 'bg-white text-black rounded-tr-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                                    : 'bg-[#111] border border-[#1A1A1A] text-[#ccc] rounded-tl-sm hover:border-[#333]'
                                                }
                                            `}>
                                                <p>{msg.content}</p>

                                                {isMe && (
                                                    <div className="absolute -bottom-1.5 -right-1">
                                                        {isSending ? (
                                                            <div className="w-2.5 h-2.5 border-[1.5px] border-black/20 border-t-black rounded-full animate-spin" />
                                                        ) : (
                                                            <div className="text-[7px] text-black/40 font-black tracking-tighter">SENT</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {typingUsers > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-[#444] px-1">
                            <div className="flex gap-1">
                                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="w-1 h-1 bg-[#666] rounded-full" />
                                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2, ease: "easeInOut" }} className="w-1 h-1 bg-[#666] rounded-full" />
                                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4, ease: "easeInOut" }} className="w-1 h-1 bg-[#666] rounded-full" />
                            </div>
                            <span className="text-[9px] protocol-text">Typing...</span>
                        </motion.div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-5 bg-black z-10">
                    <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center group">
                        <div className="absolute left-2 flex items-center gap-1">
                            <button type="button" className="p-2 text-[#444] hover:text-white hover:bg-[#111] rounded-lg transition-all">
                                <Plus size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        <input
                            className="w-full bg-[#0a0a0a] border border-[#1A1A1A] rounded-xl pl-12 pr-14 py-4 text-[14px] text-white focus:outline-none focus:border-[#333] focus:ring-1 focus:ring-[#222] transition-all placeholder:text-[#333] shadow-inner"
                            placeholder="Type payload..."
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                handleTyping(true);
                            }}
                        />

                        <div className="absolute right-2 flex items-center">
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className="p-2 bg-white text-black rounded-lg disabled:opacity-0 disabled:translate-x-2 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                            >
                                <Send size={16} fill="currentColor" strokeWidth={3} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
