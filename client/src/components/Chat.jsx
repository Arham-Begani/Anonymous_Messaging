import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, LogOut, Zap, Search, Ban, Paperclip, Smile, Shield, Plus, Globe, X, Image as ImageIcon, Hash } from 'lucide-react';
import Sidebar from './Sidebar';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import GifPicker from 'gif-picker-react';

export default function Chat({ socket }) {
    const { messages, addMessage, updateMessage, setMessages, user, logout, typingUsers, setTypingUsers, onlineCount, tenorApiKey, currentTopic } = useStore();
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const inputRef = useRef(null);
    const quickEmojis = ['❤️', '😂', '🙌', '🔥', '👏', '😮', '😢', '😍'];

    const onGifClick = (gif) => {
        const gifUrl = gif.url;
        if (!gifUrl) return;

        const msg = {
            id: Date.now() + Math.random(),
            content: gifUrl,
            senderId: user.anonymousId,
            timestamp: new Date().toISOString(),
            status: 'sending'
        };

        addMessage(msg);
        socket.emit('sendMessage', { content: gifUrl, senderId: user.id, topicId: currentTopic?.id });
        setShowGifPicker(false);
    };

    const isMedia = (text) => {
        if (typeof text !== 'string') return false;
        return text.startsWith('http') && (
            text.match(/\.(jpeg|jpg|gif|png|webp|mp4)$/i) ||
            text.includes('media.tenor.com') ||
            text.includes('giphy.com')
        );
    };

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

        // Join topic if changed
        if (currentTopic?.id) {
            socket.emit('joinTopic', { topicId: currentTopic.id });
        }
    }, [socket, currentTopic?.id]);

    useEffect(() => {
        if (!socket) return;

        const { setOnlineCount } = useStore.getState();

        socket.on('messageHistory', (history) => {
            setMessages(history);
        });

        socket.on('receiveMessage', (msg) => {
            const { user: currentUser, notificationsEnabled } = useStore.getState();
            if (String(msg.senderId) === String(currentUser?.anonymousId)) return;
            addMessage(msg);

            // Play notification sound if enabled
            if (notificationsEnabled) {
                // Audio placeholder or simple beep logic can be added here if needed
            }
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

        socket.on('newAnnouncement', (ann) => {
            const { addAnnouncement } = useStore.getState();
            addAnnouncement(ann);
        });

        return () => {
            socket.off('messageHistory');
            socket.off('receiveMessage');
            socket.off('userTyping');
            socket.off('system_message');
            socket.off('userCount');
            socket.off('newAnnouncement');
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

        socket.emit('sendMessage', { content, senderId: user?.anonymousId, topicId: currentTopic?.id }, (ack) => {
            if (ack?.success) {
                updateMessage(tempId, { status: 'delivered', id: ack.id });
            } else if (ack?.error) {
                alert(ack.error);
                setMessages(useStore.getState().messages.filter(m => m.id !== tempId));
            }
        });
    };

    const onEmojiClick = (emojiData) => {
        const { selectionStart, selectionEnd } = inputRef.current;
        const text = input;
        const before = text.substring(0, selectionStart);
        const after = text.substring(selectionEnd);
        const newText = before + emojiData.emoji + after;
        setInput(newText);

        // Return focus and set cursor position after the emoji
        setTimeout(() => {
            inputRef.current.focus();
            const newPos = selectionStart + emojiData.emoji.length;
            inputRef.current.setSelectionRange(newPos, newPos);
        }, 10);
    };

    const handleTyping = (typing) => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        if (typing) {
            if (!isTyping) {
                setIsTyping(true);
                socket.emit('typing', currentTopic?.id);
            }
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                socket.emit('typing', false); // Assuming server handles false as stopTyping or checks headers, but server listens for 'stopTyping' event usually.
                // Wait, server logic: socket.on('typing', (topicId) => ...). 
                // Client must emit 'stopTyping'.
            }, 2000);
        } else {
            setIsTyping(false);
            socket.emit('stopTyping', currentTopic?.id);
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

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
            {/* Sidebar component */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative min-w-0 h-full">
                {/* Mobile Overlay */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
                        />
                    )}
                </AnimatePresence>

                {/* Chat Header */}
                <div className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-4 md:px-6 bg-black/80 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 text-[#666] hover:text-white md:hidden"
                        >
                            <Zap size={20} />
                        </button>

                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#111] border border-[#1A1A1A] flex items-center justify-center text-white overflow-hidden relative shadow-lg">
                            <Globe size={18} className="md:size-5" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-full border-2 border-black animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                {currentTopic?.animation && currentTopic.animation !== 'none' ? (
                                    <motion.div
                                        key={`${currentTopic?.id}-anim`}
                                        animate={
                                            currentTopic.animation === 'pulse' ? {
                                                scale: [1, 0.95, 1],
                                                opacity: [1, 0.7, 1]
                                            } : currentTopic.animation === 'glow' ? {
                                                filter: [
                                                    `drop-shadow(0 0 2px ${currentTopic.accent_color || '#3B82F6'})`,
                                                    `drop-shadow(0 0 12px ${currentTopic.accent_color || '#3B82F6'})`,
                                                    `drop-shadow(0 0 2px ${currentTopic.accent_color || '#3B82F6'})`
                                                ]
                                            } : currentTopic.animation === 'shake' ? {
                                                x: [0, -2, 2, -2, 2, 0]
                                            } : {}
                                        }
                                        transition={{
                                            duration: currentTopic.animation === 'shake' ? 0.5 : 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        className="flex items-center gap-2"
                                    >
                                        {currentTopic?.slug === 'global' ?
                                            <Globe size={14} style={{ color: currentTopic?.accent_color || '#3b82f6' }} /> :
                                            <Hash size={14} style={{ color: currentTopic?.accent_color || '#888' }} />
                                        }
                                        <h2 className="font-bold text-xs md:text-sm tracking-tight text-white line-clamp-1">
                                            {currentTopic ? currentTopic.name : 'Loading...'}
                                        </h2>
                                    </motion.div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {currentTopic?.slug === 'global' ?
                                            <Globe size={14} style={{ color: currentTopic?.accent_color || '#3b82f6' }} /> :
                                            <Hash size={14} style={{ color: currentTopic?.accent_color || '#888' }} />
                                        }
                                        <h2 className="font-bold text-xs md:text-sm tracking-tight text-white line-clamp-1">
                                            {currentTopic ? currentTopic.name : 'Loading...'}
                                        </h2>
                                    </div>
                                )}
                                <Shield size={10} className="text-[#444] hidden md:block" />
                            </div>
                            <p className="text-[11px] text-[#666] protocol-text flex items-center gap-2">
                                <span
                                    className="w-1 h-1 rounded-full animate-pulse"
                                    style={{ backgroundColor: currentTopic?.accent_color || '#3b82f6' }}
                                />
                                {onlineCount || 0} ACTIVE MEMBERS
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-3">
                        <button className="p-2 text-[#666] hover:text-white hover:bg-[#111] rounded-lg transition-all hidden sm:block">
                            <Search size={18} />
                        </button>
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-2 text-[#666] hover:text-white hover:bg-[#111] rounded-lg transition-all hidden md:block"
                        >
                            <Plus size={18} className={sidebarCollapsed ? 'rotate-45 transition-transform' : 'transition-transform'} />
                        </button>
                    </div>
                </div>

                {/* Messages Container */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 scroll-smooth transition-colors duration-500"
                    style={{
                        background: currentTopic?.bg_color
                            ? `radial-gradient(circle at center, ${currentTopic.bg_color}33, black)`
                            : 'radial-gradient(circle at center, #050505, black)'
                    }}
                >
                    <div className="flex flex-col items-center justify-center py-8 opacity-40 select-none">
                        <div className="px-3 py-1 bg-[#111] border border-[#1A1A1A] rounded-full text-[9px] protocol-text mb-3 text-[#555]">
                            Encrypted Channel
                        </div>
                        <p className="text-[10px] text-center max-w-xs text-[#fff]">
                            Messages are end-to-end encrypted. Your identity is hidden as <span className="text-white font-mono">Anonymous User #{user?.anonymousId || '????'}</span>.
                        </p>
                        {currentTopic?.description && (
                            <p className="text-[9px] text-[#FFC0CB] mt-2 max-w-md text-center">{currentTopic.description}</p>
                        )}
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
                                                <span
                                                    className="text-[10px] font-bold protocol-text hover:opacity-80 transition-all cursor-default"
                                                    style={{ color: currentTopic?.username_color || '#666' }}
                                                >
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
                                                {user?.role === 'admin' && (
                                                    <button
                                                        onClick={() => socket.emit('admin:clearChat', { topicId: currentTopic?.id })}
                                                        title="Clear Topic Chat"
                                                        className="ml-2 text-[9px] text-red-700/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        [NUKE]
                                                    </button>
                                                )}
                                                <span className="text-[9px] text-[#333] protocol-text">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <div className={`
                                                relative transition-all
                                                ${(() => {
                                                    if (isMedia(msg.content)) {
                                                        return 'p-1.5 bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden shadow-xl max-w-sm hover:border-[#333]';
                                                    }
                                                    // Robust emoji-only check using Unicode Property Escapes
                                                    // \p{Emoji} matches emojis, \p{Extended_Pictographic} matches newer symbols
                                                    const content = msg.content.trim();
                                                    const emojiRegex = /^[\p{Emoji}\p{Extended_Pictographic}\u{200D}\u{FE0F}]+$/u;

                                                    // Filter out messages that are Just numbers (which \p{Emoji} sometimes includes)
                                                    const isOnlyEmojis = emojiRegex.test(content) && !/^\d+$/.test(content);

                                                    if (isOnlyEmojis) {
                                                        return 'text-[45px] leading-tight select-none py-2 px-1 animate-in zoom-in-50 duration-300';
                                                    }

                                                    return `
                                                        px-5 py-3 rounded-2xl text-[14px] leading-relaxed shadow-md
                                                        ${isMe
                                                            ? 'bg-white/90 text-black rounded-tr-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                                            : 'border rounded-tl-sm'
                                                        }
                                                    `;
                                                })()}
                                            `}
                                                style={!isMedia(msg.content) ? {
                                                    backgroundColor: isMe ? `${currentTopic?.bg_color || '#ffffff'}cc` : (currentTopic?.bg_color || '#111'),
                                                    color: isMe ? (currentTopic?.text_color || '#000000') : (currentTopic?.text_color || '#ccc'),
                                                    borderColor: currentTopic?.accent_color ? `${currentTopic.accent_color}66` : '#1A1A1A'
                                                } : undefined}
                                            >
                                                <div className={isMedia(msg.content) ? 'w-full' : ''}>
                                                    {isMedia(msg.content) ? (
                                                        <img
                                                            src={msg.content}
                                                            alt="Media"
                                                            className="w-full h-auto rounded-xl object-contain bg-black/50 min-w-[200px] min-h-[100px]"
                                                            loading="lazy"
                                                            onLoad={() => {
                                                                if (shouldAutoScroll) {
                                                                    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <p>{msg.content}</p>
                                                    )}
                                                </div>

                                                {isMe && (
                                                    <div className={`absolute -bottom-1.5 -right-1 ${(/[\p{Emoji}\p{Extended_Pictographic}]/u.test(msg.content) && !/[a-zA-Z0-9]/.test(msg.content)) || isMedia(msg.content) ? 'opacity-40 invert' : ''}`}>
                                                        {isSending ? (
                                                            <div className="w-2.5 h-2.5 border-[1.5px] border-black/20 border-t-black rounded-full animate-spin" />
                                                        ) : (
                                                            <div className="text-[7px] text-black/40 font-black tracking-tighter">SENT</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                    }
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
                <div
                    className="p-4 md:p-5 bg-black z-10 border-t transition-colors duration-500"
                    style={{ borderColor: currentTopic?.accent_color ? `${currentTopic.accent_color}20` : '#111' }}
                >
                    <div className="max-w-4xl mx-auto flex flex-col gap-3">
                        {/* Quick Emojis Bar */}
                        <div className="flex items-center gap-2 px-1 overflow-x-auto no-scrollbar">
                            {quickEmojis.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => onEmojiClick({ emoji })}
                                    className="text-lg hover:scale-125 transition-transform p-1 animate-in fade-in slide-in-from-bottom-1"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSend} className="relative flex items-center group">
                            <div className="absolute left-3 flex items-center">
                                <button type="button" className="p-1.5 text-[#444] hover:text-white hover:bg-[#111] rounded-lg transition-all group/plus">
                                    <Plus size={20} strokeWidth={2.5} className="group-hover/plus:rotate-90 transition-transform" />
                                </button>
                            </div>

                            <input
                                ref={inputRef}
                                className="w-full bg-[#0a0a0a] border border-[#1A1A1A] rounded-2xl pl-12 pr-12 py-3.5 text-[14px] text-white focus:outline-none focus:border-[#333] focus:ring-1 focus:ring-[#222] transition-all placeholder:text-[#333] shadow-inner"
                                placeholder="Type payload..."
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    handleTyping(true);
                                }}
                            />

                            <div className="absolute right-3 flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowGifPicker(!showGifPicker);
                                        setShowEmojiPicker(false);
                                    }}
                                    className={`p-1.5 transition-all rounded-lg ${showGifPicker ? 'text-white bg-[#111]' : 'text-[#444] hover:text-white hover:bg-[#111]'}`}
                                    title="Search GIFs"
                                >
                                    <ImageIcon size={20} strokeWidth={2.5} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEmojiPicker(!showEmojiPicker);
                                        setShowGifPicker(false);
                                    }}
                                    className={`p-1.5 transition-all rounded-lg ${showEmojiPicker ? 'text-white bg-[#111]' : 'text-[#444] hover:text-white hover:bg-[#111]'}`}
                                >
                                    <Smile size={20} strokeWidth={2.5} />
                                </button>

                                {input.trim() && (
                                    <motion.button
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        type="submit"
                                        className="p-1.5 transition-colors"
                                        style={{ color: currentTopic?.accent_color || '#3b82f6' }}
                                    >
                                        <Send size={18} fill="currentColor" strokeWidth={3} />
                                    </motion.button>
                                )}
                            </div>

                            {/* Emoji Picker Popover */}
                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-[#1A1A1A]"
                                    >
                                        <EmojiPicker
                                            onEmojiClick={onEmojiClick}
                                            theme={Theme.DARK}
                                            lazyLoadEmojis={true}
                                            searchPlaceholder="Search protocol..."
                                            width={350}
                                            height={400}
                                            skinTonesDisabled={true}
                                            previewConfig={{ showPreview: false }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* GIF Picker Popover */}
                            <AnimatePresence>
                                {showGifPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-[#1A1A1A]"
                                    >
                                        {tenorApiKey ? (
                                            <GifPicker
                                                tenorApiKey={tenorApiKey}
                                                onGifClick={onGifClick}
                                                theme="dark"
                                                width={350}
                                                height={400}
                                            />
                                        ) : (
                                            <div className="bg-[#0a0a0a] p-6 w-[350px] border border-[#1A1A1A] rounded-2xl flex flex-col items-center text-center gap-3">
                                                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-1">
                                                    <Shield size={24} className="text-blue-500" />
                                                </div>
                                                <h3 className="text-sm font-bold text-white uppercase tracking-widest text-[10px]">Transmission Locked</h3>
                                                <p className="text-[10px] text-[#444] leading-relaxed">
                                                    GIF capabilities require a Tenor API Key. <br />
                                                    Initialize in **Appearance** settings.
                                                </p>
                                                <button
                                                    onClick={() => setShowGifPicker(false)}
                                                    className="mt-2 text-[10px] text-[#666] hover:text-white protocol-text"
                                                >
                                                    [DISMISS]
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                </div>
            </div>
        </div >
    );
}
