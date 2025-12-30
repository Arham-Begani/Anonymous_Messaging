import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, LogOut, Zap, Search, Ban, Paperclip, Smile, Shield, Plus, Globe, X } from 'lucide-react';
import Sidebar from './Sidebar';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export default function Chat({ socket }) {
    const { messages, addMessage, updateMessage, setMessages, user, logout, typingUsers, setTypingUsers, onlineCount } = useStore();
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const inputRef = useRef(null);
    const quickEmojis = ['❤️', '😂', '🙌', '🔥', '👏', '😮', '😢', '😍'];

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

        socket.emit('sendMessage', { content, senderId: user?.anonymousId }, (ack) => {
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
                                <h2 className="font-bold text-xs md:text-sm tracking-tight text-white line-clamp-1">Global Group</h2>
                                <Shield size={10} className="text-[#444] hidden md:block" />
                            </div>
                            <p className="text-[9px] text-[#666] protocol-text flex items-center gap-1.5">
                                <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-green-500 inline-block" />
                                {onlineCount || 0} <span className="hidden xs:inline">Online</span>
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
                    className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 scroll-smooth bg-[radial-gradient(circle_at_center,#050505,black)]"
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
                                                relative transition-all
                                                ${(() => {
                                                    // Check if content is only emojis (up to 3 for big size)
                                                    const emojiRegex = /^(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2194-\u2199]|\u2ad5|\u2ae4|\u21a9|\u21aa|\u25af|\u25b0|\u25b1|\u25b2|\u25b3|\u25b4|\u25b5|\u25b6|\u25b7|\u25b8|\u25b9|\u25ba|\u25bb|\u25bc|\u25bd|\u25be|\u25bf|\u25c0|\u25c1|\u25c2|\u25c3|\u25c4|\u25c5|\u25c6|\u25c7|\u25c8|\u25c9|\u25ca|\u25cb|\u25cc|\u25cd|\u25ce|\u25cf|\u25d0|\u25d1|\u25d2|\u25d3|\u25d4|\u25d5|\u25d6|\u25d7|\u25d8|\u25d9|\u25da|\u25db|\u25dc|\u25dd|\u25de|\u25df|\u25e0|\u25e1|\u25e2|\u25e3|\u25e4|\u25e5|\u25e6|\u25e7|\u25e8|\u25e9|\u25ea|\u25eb|\u25ec|\u25ed|\u25ee|\u25ef|\u25f0|\u25f1|\u25f2|\u25f3|\u25f4|\u25f5|\u25f6|\u25f7|\u25f8|\u25f9|\u25fa|\u25fb|\u25fc|\u25fd|\u25fe|\u25ff|\s)+$/u;
                                                    const isOnlyEmojis = emojiRegex.test(msg.content);

                                                    if (isOnlyEmojis) {
                                                        return 'text-[40px] leading-tight select-none py-1';
                                                    }

                                                    return `
                                                        px-5 py-3 rounded-2xl text-[14px] leading-relaxed shadow-md
                                                        ${isMe
                                                            ? 'bg-white text-black rounded-tr-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                                            : 'bg-[#111] border border-[#1A1A1A] text-[#ccc] rounded-tl-sm hover:border-[#333]'
                                                        }
                                                    `;
                                                })()}
                                            `}>
                                                <p>{msg.content}</p>

                                                {isMe && !(/^(?:[\u2700-\u27bf]|[\ud800-\udbff][\udc00-\udfff]|\s)+$/u.test(msg.content)) && (
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
                <div className="p-4 md:p-5 bg-black z-10 border-t border-[#111]">
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
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-1.5 transition-all rounded-lg ${showEmojiPicker ? 'text-white bg-[#111]' : 'text-[#444] hover:text-white hover:bg-[#111]'}`}
                                >
                                    <Smile size={20} strokeWidth={2.5} />
                                </button>

                                {input.trim() && (
                                    <motion.button
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        type="submit"
                                        className="p-1.5 text-white hover:text-blue-400 transition-colors"
                                    >
                                        <Send size={18} fill="currentColor" strokeWidth={3} />
                                    </motion.button>
                                )}
                            </div>

                            {/* Emoji Picker Popover */}
                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowEmojiPicker(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full right-0 mb-4 z-50"
                                        >
                                            <div className="border border-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl shadow-black">
                                                <EmojiPicker
                                                    onEmojiClick={onEmojiClick}
                                                    theme={Theme.DARK}
                                                    lazyLoadEmojis={true}
                                                    searchPlaceHolder="Search payload..."
                                                    width={300}
                                                    height={380}
                                                    skinTonesDisabled
                                                    previewConfig={{ showPreview: false }}
                                                    autoFocusSearch={false}
                                                    style={{
                                                        '--epr-bg-color': '#0a0a0a',
                                                        '--epr-category-label-bg-color': '#0a0a0a',
                                                        '--epr-picker-border-color': 'transparent',
                                                        '--epr-search-input-bg-color': '#111',
                                                        '--epr-search-input-placeholder-color': '#444',
                                                        '--epr-search-input-border-color': '#1A1A1A',
                                                        '--epr-emoji-hover-color': '#1a1a1a'
                                                    }}
                                                />
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
