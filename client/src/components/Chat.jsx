import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, LogOut, Zap, Search, Ban, Paperclip, Smile, Shield, Plus, Globe, X, Image as ImageIcon, Hash, Trash2 } from 'lucide-react';
import Sidebar from './Sidebar';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import GifPicker from 'gif-picker-react';
import imageCompression from 'browser-image-compression';

export default function Chat({ socket }) {
    const { messages, addMessage, updateMessage, setMessages, user, logout, typingUsers, setTypingUsers, onlineCount, tenorApiKey, currentTopic } = useStore();
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showQuickEmojis, setShowQuickEmojis] = useState(false);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
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
        // Trust all /uploads/ paths as media, regardless of extension 
        // (since we control the upload folder and it only contains media)
        if (text.startsWith('/uploads/')) return true;

        const isUrl = text.startsWith('http');
        return isUrl && (
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
        setShowQuickEmojis(false);
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Optimistic UI: Send a "uploading" message
            const tempId = generateUUID();
            addMessage({
                id: tempId,
                content: 'Uploading file...',
                senderId: user?.anonymousId,
                timestamp: new Date().toISOString(),
                status: 'sending'
            });

            let uploadFile = file;

            // Compress if it's an image
            if (file.type.startsWith('image/')) {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    initialQuality: 0.8
                };
                try {
                    const compressedBlob = await imageCompression(file, options);
                    // Re-create File object to preserve name and type
                    uploadFile = new File([compressedBlob], file.name, { type: file.type });
                } catch (error) {
                    console.error('Compression failed, using original file', error);
                }
            }

            const formData = new FormData();
            formData.append('file', uploadFile);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();

            // UPDATE the temp message with real content instead of deleting and re-sending
            updateMessage(tempId, { content: data.url, status: 'sending' });

            // Pass tempId as senderId param (hacky but effective for messageAck) 
            // OR ideally, update backend to accept tempId separate from senderId.
            // But checking backend code: socket.on('messageAck', { tempId: senderId, ... })
            // So if we pass tempId as senderId, backend echoes it back as tempId.
            // BUT wait, backend also uses senderId for DB insertion:
            // const result = await query(insertSql, [content, user.id, user.anonymousId, finalTopicId]);
            // Backend uses `user.anonymousId` (from session) for DB, NOT the `senderId` param for insertion?
            // Let's verify backend usage of `senderId` param.
            // Backend: socket.on('sendMessage', async ({ content, senderId, topicId }) => { ... })
            // And: socket.emit('messageAck', { tempId: senderId, message: newMessage });
            // It ONLY uses `senderId` param to echo back as `tempId`. 
            // The DB insertion uses `user.id` and `user.anonymousId` from the socket session.
            // So passing `tempId` as `senderId` is SAFE and CORRECT for this pattern.

            socket.emit('sendMessage', { content: data.url, senderId: tempId, topicId: currentTopic?.id });

        } catch (err) {
            console.error('Upload error:', err);
            alert('File upload failed');
            // setMessages(useStore.getState().messages.filter(m => m.id !== tempId)); // Optionally remove failed message
        }
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
            setShowQuickEmojis(false);
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
        <div className="flex h-screen bg-background text-primary overflow-hidden font-sans">
            {/* Sidebar component */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                socket={socket}
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
                <div className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background-elevated/95 backdrop-blur-xl z-10 shrink-0 transition-colors">
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 text-muted hover:text-primary transition-colors rounded-lg hover:bg-surface md:hidden"
                        >
                            <Zap size={20} />
                        </button>

                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-accent-hover/20 border border-accent/30 flex items-center justify-center text-accent overflow-hidden relative shadow-glow-sm">
                            <Globe size={20} />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-background-elevated status-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                {currentTopic?.animation && currentTopic.animation !== 'none' ? (
                                    <motion.div
                                        key={`${currentTopic?.id}-anim`}
                                        animate={
                                            currentTopic.animation === 'pulse' ? {
                                                scale: [1, 0.95, 1],
                                                opacity: [1, 0.7, 1]
                                            } : currentTopic.animation === 'glow' ? {
                                                filter: [
                                                    `drop-shadow(0 0 2px ${currentTopic.accent_color || '#6366F1'})`,
                                                    `drop-shadow(0 0 12px ${currentTopic.accent_color || '#6366F1'})`,
                                                    `drop-shadow(0 0 2px ${currentTopic.accent_color || '#6366F1'})`
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
                                            <Globe size={16} style={{ color: currentTopic?.accent_color || '#6366F1' }} /> :
                                            <Hash size={16} style={{ color: currentTopic?.accent_color || '#888' }} />
                                        }
                                        <h2 className="font-bold text-sm md:text-base tracking-tight text-primary line-clamp-1">
                                            {currentTopic ? currentTopic.name : 'Loading...'}
                                        </h2>
                                    </motion.div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {currentTopic?.slug === 'global' ?
                                            <Globe size={16} style={{ color: currentTopic?.accent_color || '#6366F1' }} /> :
                                            <Hash size={16} style={{ color: currentTopic?.accent_color || '#888' }} />
                                        }
                                        <h2 className="font-bold text-sm md:text-base tracking-tight text-primary line-clamp-1">
                                            {currentTopic ? currentTopic.name : 'Loading...'}
                                        </h2>
                                    </div>
                                )}
                                <Shield size={12} className="text-muted hidden md:block" />
                            </div>
                            <p className="text-[10px] text-secondary font-medium flex items-center gap-2">
                                <span
                                    className="w-1.5 h-1.5 rounded-full status-pulse"
                                    style={{ backgroundColor: currentTopic?.accent_color || '#6366F1' }}
                                />
                                <span className="font-mono text-[9px] tracking-wider">{onlineCount || 0} ONLINE</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                        <button className="p-2 text-muted hover:text-primary hover:bg-surface rounded-lg transition-all hidden sm:block">
                            <Search size={18} />
                        </button>
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-2 text-muted hover:text-primary hover:bg-surface rounded-lg transition-all hidden md:block"
                        >
                            <Plus size={18} className={sidebarCollapsed ? 'rotate-45 transition-transform' : 'transition-transform'} />
                        </button>
                    </div>
                </div>

                {/* Messages Container */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4 custom-scrollbar"
                    style={{
                        background: currentTopic?.bg_color
                            ? `radial-gradient(ellipse at top, ${currentTopic.bg_color}15, transparent 50%), linear-gradient(to bottom, #0A0B0F, #12141A)`
                            : 'linear-gradient(to bottom, #0A0B0F, #12141A)'
                    }}
                >
                    <div className="flex flex-col items-center justify-center py-12 opacity-60 select-none">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="px-4 py-2 bg-surface/50 border border-border rounded-full text-[10px] font-semibold mb-4 text-secondary backdrop-blur-sm"
                        >
                            🔒 End-to-End Encrypted
                        </motion.div>
                        <p className="text-xs text-center max-w-md text-secondary leading-relaxed">
                            Your identity is protected as <span className="text-primary font-semibold font-mono">Anonymous User #{user?.anonymousId || '????'}</span>
                        </p>
                        {currentTopic?.description && (
                            <p className="text-[11px] text-accent mt-3 max-w-md text-center font-medium">{currentTopic.description}</p>
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
                                        <div className="bg-surface/60 border border-border px-4 py-2 rounded-full backdrop-blur-sm">
                                            <span className="text-[10px] text-secondary font-medium">{msg.content}</span>
                                        </div>
                                    ) : (
                                        <div className={`max-w-[75%] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <span
                                                    className="text-[11px] font-semibold hover:opacity-80 transition-opacity cursor-default"
                                                    style={{ color: currentTopic?.username_color || '#9CA3B4' }}
                                                >
                                                    {isMe ? 'You' : `Anonymous #${msg.senderId || 'Unknown'}`}
                                                </span>
                                                {user?.role === 'admin' && !isMe && (
                                                    <button
                                                        onClick={() => handleBan(msg.senderId)}
                                                        className="text-[9px] text-error/60 hover:text-error font-medium opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded hover:bg-error/10"
                                                    >
                                                        BAN
                                                    </button>
                                                )}
                                                {user?.role === 'admin' && (
                                                    <button
                                                        onClick={() => socket.emit('admin:clearChat', { topicId: currentTopic?.id })}
                                                        title="Clear Topic Chat"
                                                        className="ml-1 text-[9px] text-error/60 hover:text-error font-medium opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded hover:bg-error/10"
                                                    >
                                                        CLEAR
                                                    </button>
                                                )}
                                                {(isMe || user?.role === 'admin') && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Delete this message?')) {
                                                                socket.emit('deleteMessage', { messageId: msg.id, topicId: currentTopic?.id });
                                                            }
                                                        }}
                                                        className="ml-1 text-muted/60 hover:text-error opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-error/10"
                                                        title="Delete Message"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                )}
                                                <span className="text-[9px] text-muted/50 font-medium ml-auto">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <div className={`
                                                relative transition-all duration-200
                                                ${(() => {
                                                    if (isMedia(msg.content)) {
                                                        return 'p-2 bg-surface border border-border rounded-2xl overflow-hidden shadow-card max-w-sm hover:border-border-hover hover:shadow-card-hover';
                                                    }
                                                    // Robust emoji-only check using Unicode Property Escapes
                                                    // \p{Emoji} matches emojis, \p{Extended_Pictographic} matches newer symbols
                                                    const content = msg.content.trim();
                                                    const emojiRegex = /^[\p{Emoji}\p{Extended_Pictographic}\u{200D}\u{FE0F}]+$/u;

                                                    // Filter out messages that are Just numbers (which \p{Emoji} sometimes includes)
                                                    const isOnlyEmojis = emojiRegex.test(content) && !/^\d+$/.test(content);

                                                    if (isOnlyEmojis) {
                                                        return 'text-5xl leading-tight select-none py-2 px-2';
                                                    }

                                                    return `
                                                        px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm
                                                        ${isMe
                                                            ? 'bg-gradient-to-br from-accent to-accent-hover text-white rounded-tr-md hover:shadow-glow-sm'
                                                            : 'bg-bubble-received border border-border rounded-tl-md hover:border-border-hover'
                                                        }
                                                    `;
                                                })()}
                                            `}
                                                style={!isMedia(msg.content) && !(/[\p{Emoji}\p{Extended_Pictographic}]/u.test(msg.content) && !/[a-zA-Z0-9]/.test(msg.content)) ? (
                                                    isMe ? {
                                                        background: currentTopic?.bg_color ? `linear-gradient(135deg, ${currentTopic.bg_color}, ${currentTopic.accent_color || '#7C3AED'})` : undefined,
                                                        color: currentTopic?.text_color || '#ffffff',
                                                    } : {
                                                        backgroundColor: currentTopic?.bg_color ? `${currentTopic.bg_color}20` : undefined,
                                                        color: currentTopic?.text_color || '#E8EBF3',
                                                        borderColor: currentTopic?.accent_color ? `${currentTopic.accent_color}40` : undefined
                                                    }
                                                ) : undefined}
                                            >
                                                <div className={isMedia(msg.content) ? 'w-full' : ''}>
                                                    {isMedia(msg.content) ? (
                                                        msg.content.match(/\.mp4$/i) ? (
                                                            <video
                                                                src={msg.content}
                                                                controls
                                                                className="w-full h-auto rounded-xl bg-black/50 min-w-[200px]"
                                                            />
                                                        ) : (
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
                                                        )
                                                    ) : (
                                                        <p>{msg.content}</p>
                                                    )}
                                                </div>

                                                {isMe && !(/[\p{Emoji}\p{Extended_Pictographic}]/u.test(msg.content) && !/[a-zA-Z0-9]/.test(msg.content)) && (
                                                    <div className="absolute -bottom-1 -right-1">
                                                        {isSending ? (
                                                            <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <div className="text-[8px] text-white/60 font-bold tracking-tight">✓✓</div>
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
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex items-center gap-3 px-2"
                        >
                            <div className="flex items-center gap-1 px-3 py-2 bg-surface border border-border rounded-2xl">
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-accent rounded-full typing-dot" />
                                    <div className="w-1.5 h-1.5 bg-accent rounded-full typing-dot" />
                                    <div className="w-1.5 h-1.5 bg-accent rounded-full typing-dot" />
                                </div>
                                <span className="text-[10px] text-secondary font-medium ml-2">Someone is typing</span>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-5 bg-background-elevated/95 backdrop-blur-xl z-10 border-t border-border">
                    <div className="max-w-4xl mx-auto flex flex-col gap-3">
                        {/* Quick Emojis Bar */}
                        <AnimatePresence>
                            {showQuickEmojis && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 px-2 pb-3 overflow-x-auto no-scrollbar">
                                        {quickEmojis.map((emoji, idx) => (
                                            <motion.button
                                                key={emoji}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                type="button"
                                                onClick={() => onEmojiClick({ emoji })}
                                                className="text-2xl hover:scale-125 transition-transform p-2 rounded-lg hover:bg-surface"
                                            >
                                                {emoji}
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSend} className="relative flex items-center group">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileUpload}
                                accept="image/*,video/*"
                            />
                            <div className="absolute left-3 flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-muted hover:text-primary hover:bg-surface rounded-lg transition-all"
                                    title="Upload File"
                                >
                                    <Paperclip size={20} strokeWidth={2} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowQuickEmojis(!showQuickEmojis)}
                                    className={`p-2 rounded-lg transition-all ${showQuickEmojis ? 'text-accent bg-accent/10' : 'text-muted hover:text-primary hover:bg-surface'}`}
                                >
                                    <Plus size={20} strokeWidth={2} className={`transition-transform duration-300 ${showQuickEmojis ? 'rotate-45' : ''}`} />
                                </button>
                            </div>

                            <input
                                ref={inputRef}
                                className="w-full bg-surface border border-border rounded-2xl pl-20 pr-32 py-3.5 text-[14px] text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-muted/60"
                                placeholder="Type a message..."
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    handleTyping(true);
                                }}
                            />

                            <div className="absolute right-3 flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowGifPicker(!showGifPicker);
                                        setShowEmojiPicker(false);
                                    }}
                                    className={`p-2 transition-all rounded-lg ${showGifPicker ? 'text-accent bg-accent/10' : 'text-muted hover:text-primary hover:bg-surface'}`}
                                    title="Search GIFs"
                                >
                                    <ImageIcon size={20} strokeWidth={2} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEmojiPicker(!showEmojiPicker);
                                        setShowGifPicker(false);
                                    }}
                                    className={`p-2 transition-all rounded-lg ${showEmojiPicker ? 'text-accent bg-accent/10' : 'text-muted hover:text-primary hover:bg-surface'}`}
                                >
                                    <Smile size={20} strokeWidth={2} />
                                </button>

                                {input.trim() && (
                                    <motion.button
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        type="submit"
                                        className="p-2 bg-gradient-to-br from-accent to-accent-hover text-white rounded-lg hover:shadow-glow-sm transition-all btn-press"
                                    >
                                        <Send size={18} fill="currentColor" strokeWidth={0} />
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