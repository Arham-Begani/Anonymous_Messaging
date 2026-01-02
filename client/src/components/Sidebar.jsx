import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Users, Megaphone, Palette, LogOut, Disc, X, Moon, Bell, BellOff, Shield, UserPlus, Trash2, Eye, EyeOff, Hash, Plus, Settings, Activity } from 'lucide-react';
import { useStore } from '../store';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse, socket }) {
    const { user, logout, onlineCount, announcements, setAnnouncements, notificationsEnabled, toggleNotifications, topics, setTopics, currentTopic, setCurrentTopic, addTopic, updateTopic, deleteTopic } = useStore();
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const [showAppearance, setShowAppearance] = useState(false);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showManageUsers, setShowManageUsers] = useState(false);
    // const [notifications, setNotifications] = useState(true); // Removed local state

    // Online Users
    const [showOnlineUsers, setShowOnlineUsers] = useState(false);
    const [onlineUsersList, setOnlineUsersList] = useState([]);
    const [onlineUsersLoading, setOnlineUsersLoading] = useState(false);




    const [announcementLoading, setAnnouncementLoading] = useState(false);
    const [showLaunchAnnouncement, setShowLaunchAnnouncement] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [launchLoading, setLaunchLoading] = useState(false);
    const [launchMessage, setLaunchMessage] = useState('');

    // Create user form
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('user');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createMessage, setCreateMessage] = useState('');

    // User list
    const [userList, setUserList] = useState([]);
    const [listLoading, setListLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    // Create Topic
    const [showCreateTopic, setShowCreateTopic] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicDesc, setNewTopicDesc] = useState('');
    const [createTopicLoading, setCreateTopicLoading] = useState(false);
    const [createTopicMsg, setCreateTopicMsg] = useState('');

    // Edit Topic
    const [showEditTopic, setShowEditTopic] = useState(false);
    const [editingTopic, setEditingTopic] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editBgColor, setEditBgColor] = useState('#0A0A0A');
    const [editTextColor, setEditTextColor] = useState('#FFFFFF');
    const [editAccentColor, setEditAccentColor] = useState('#3B82F6');
    const [editAnimation, setEditAnimation] = useState('none');
    const [editUsernameColor, setEditUsernameColor] = useState('#888888');
    const [editLoading, setEditLoading] = useState(false);
    const [editMsg, setEditMsg] = useState('');



    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateMessage('');

        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminToken: user.token,
                    username: newUsername,
                    password: newPassword,
                    role: newRole
                })
            });
            const data = await res.json();

            if (res.ok) {
                setCreateMessage(`✓ Created: ${data.username} (ID #${data.anonymousId})`);
                setNewUsername('');
                setNewPassword('');
                setNewRole('user');
            } else {
                setCreateMessage(`✗ ${data.error}`);
            }
        } catch (err) {
            setCreateMessage('✗ Failed to create user :(');
        }
        setCreateLoading(false);
    };

    const loadUsers = async () => {
        setListLoading(true);
        try {
            const res = await fetch('/api/admin/list-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminToken: user.token })
            });
            const data = await res.json();
            if (res.ok) {
                setUserList(data.users);
            }
        } catch (err) {
            console.error('Failed to load users :(');
        }
        setListLoading(false);
    };

    const handleGetOnlineUsers = () => {
        if (!socket) return;
        setOnlineUsersLoading(true);
        socket.emit('getOnlineUsers');
        setShowOnlineUsers(true);
    };

    useEffect(() => {
        if (!socket) return;

        const onOnlineUsersList = (users) => {
            setOnlineUsersList(users);
            setOnlineUsersLoading(false);
        };

        socket.on('onlineUsersList', onOnlineUsersList);
        return () => socket.off('onlineUsersList', onOnlineUsersList);
    }, [socket]);

    const deleteUser = async (userId) => {
        if (!confirm('Delete this user?')) return;
        try {
            await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminToken: user.token, userId })
            });
            loadUsers();
        } catch (err) {
            console.error('Failed to delete user');
        }
    };

    const loadAnnouncements = async () => {
        setAnnouncementLoading(true);
        try {
            const res = await fetch('/api/announcements');
            const data = await res.json();
            if (res.ok) setAnnouncements(data.announcements);
        } catch (err) {
            console.error('Failed to load announcements');
        }
        setAnnouncementLoading(false);
    };

    const loadTopics = async () => {
        try {
            const res = await fetch('/api/topics');
            const data = await res.json();
            if (res.ok) {
                setTopics(data.topics);
                // Set default topic if none selected
                if (!currentTopic && data.topics.length > 0) {
                    const global = data.topics.find(t => t.slug === 'global') || data.topics[0];
                    setCurrentTopic(global);
                }
            }
        } catch (err) {
            console.error('Failed to load topics');
        }
    };

    const handleCreateTopic = async (e) => {
        e.preventDefault();
        setCreateTopicLoading(true);
        setCreateTopicMsg('');

        try {
            const res = await fetch('/api/admin/create-topic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminToken: user.token,
                    name: newTopicName,
                    description: newTopicDesc
                })
            });
            const data = await res.json();

            if (res.ok) {
                setCreateTopicMsg('✓ Topic Created');
                addTopic(data.topic);
                setCurrentTopic(data.topic); // Switch to the new topic
                setNewTopicName('');
                setNewTopicDesc('');
                setTimeout(() => setShowCreateTopic(false), 1500);
            } else {
                setCreateTopicMsg(`✗ ${data.error}`);
            }
        } catch (err) {
            setCreateTopicMsg('✗ Failed to create topic');
        }
        setCreateTopicLoading(false);
    };

    const openEditTopic = (topic) => {
        setEditingTopic(topic);
        setEditName(topic.name);
        setEditDesc(topic.description || '');
        setEditBgColor(topic.bg_color || '#0A0A0A');
        setEditTextColor(topic.text_color || '#FFFFFF');
        setEditAccentColor(topic.accent_color || '#3B82F6');
        setEditAnimation(topic.animation || 'none');
        setEditUsernameColor(topic.username_color || '#888888');
        setEditMsg('');
        setShowEditTopic(true);
    };

    const handleUpdateTopic = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        setEditMsg('');
        try {
            const res = await fetch('/api/admin/update-topic', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminToken: user.token,
                    topicId: editingTopic.id,
                    name: editName,
                    description: editDesc,
                    bg_color: editBgColor,
                    text_color: editTextColor,
                    accent_color: editAccentColor,
                    animation: editAnimation,
                    username_color: editUsernameColor
                })
            });
            const data = await res.json();
            if (res.ok) {
                setEditMsg('✓ Updated');
                // Use store action
                updateTopic(data.topic);
                setTimeout(() => setShowEditTopic(false), 1000);
            } else {
                setEditMsg(`✗ ${data.error}`);
            }
        } catch (err) {
            setEditMsg('✗ Failed to update');
        }
        setEditLoading(false);
    };

    const handleDeleteTopic = async () => {
        if (!confirm(`Delete "${editingTopic.name}" and all its messages?`)) return;
        setEditLoading(true);
        try {
            const res = await fetch('/api/admin/delete-topic', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminToken: user.token, topicId: editingTopic.id })
            });
            const data = await res.json();
            if (res.ok) {
                deleteTopic(editingTopic.id);
                setShowEditTopic(false);
            } else {
                setEditMsg(`✗ ${data.error}`);
            }
        } catch (err) {
            setEditMsg('✗ Failed to delete');
        }
        setEditLoading(false);
    };

    useEffect(() => {
        if (showAnnouncements) {
            loadAnnouncements();
        }
    }, [showAnnouncements]);

    useEffect(() => {
        loadAnnouncements();
        loadTopics();
    }, []);

    const handleLaunchAnnouncement = async (e) => {
        e.preventDefault();
        setLaunchLoading(true);
        setLaunchMessage('');
        try {
            const res = await fetch('/api/admin/create-announcement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminToken: user.token,
                    content: newAnnouncement
                })
            });
            const data = await res.json();
            if (res.ok) {
                setLaunchMessage('✓ Announcement Launched');
                setNewAnnouncement('');
                loadAnnouncements();
                setTimeout(() => setShowLaunchAnnouncement(false), 1500);
            } else {
                setLaunchMessage(`✗ ${data.error}`);
            }
        } catch (err) {
            setLaunchMessage('✗ Failed');
        }
        setLaunchLoading(false);
    };
    return (
        <>
            <motion.div
                initial={false}
                animate={{
                    width: isCollapsed ? 72 : 256
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`
                    fixed md:relative h-full bg-background-elevated border-r border-border flex flex-col z-30 font-sans transition-all duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
                style={{
                    left: 0,
                    top: 0,
                }}
            >
                {/* Header */}
                <div className={`p-6 pb-2 ${isCollapsed ? 'px-0 flex justify-center' : ''}`}>
                    <div className="flex items-center gap-3 w-full">
                        <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                            className="w-8 h-8 bg-surface border border-border rounded-lg flex items-center justify-center shrink-0"
                        >
                            <Disc size={18} className="text-accent" />
                        </motion.div>
                        {!isCollapsed && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">
                                <h1 className="font-bold text-primary tracking-tight text-sm">Backrow</h1>
                                <p className="text-[9px] text-muted font-medium">V2.5.0</p>
                            </motion.div>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-2 -mr-2 md:hidden text-muted hover:text-primary transition-colors"
                            aria-label="Close sidebar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Menu */}
                <div className={`flex-1 px-3 py-6 space-y-1 overflow-y-auto ${isCollapsed ? 'px-2' : ''}`}>
                    <div className="my-2 px-3">
                        <div className={`flex items-center justify-between group mb-4 ${isCollapsed ? 'justify-center' : ''}`}>
                            {!isCollapsed && (
                                <div className="flex flex-col">
                                    <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider">Channels</h3>
                                    <span className="text-[8px] text-muted/50 font-medium">Active Topics</span>
                                </div>
                            )}
                            {user?.role === 'admin' && !isCollapsed && (
                                <motion.button
                                    whileHover={{ rotate: 90 }}
                                    onClick={() => setShowCreateTopic(true)}
                                    className="text-muted hover:text-accent transition-colors bg-surface p-1.5 rounded-lg border border-border hover:border-accent/50"
                                >
                                    <Plus size={14} />
                                </motion.button>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {[...topics]
                                .sort((a, b) => (a.slug === 'global' ? -1 : b.slug === 'global' ? 1 : a.name.localeCompare(b.name)))
                                .map(topic => (
                                    <motion.button
                                        key={topic.id}
                                        whileHover={{ x: isCollapsed ? 0 : 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setCurrentTopic(topic);
                                            if (window.innerWidth < 768) onClose(); // Close sidebar on mobile
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group ${isCollapsed ? 'justify-center px-0' : ''} ${currentTopic?.id === topic.id ? 'bg-surface border-accent/30 text-primary shadow-card' : 'border-transparent text-secondary hover:text-primary hover:bg-surface/50'}`}
                                        title={isCollapsed ? topic.name : ""}
                                    >
                                        <div className={`p-1.5 rounded-lg transition-colors`} style={{ backgroundColor: topic.accent_color ? `${topic.accent_color}15` : 'rgba(99, 102, 241, 0.1)', color: topic.accent_color || '#6366F1' }}>
                                            {topic.slug === 'global' ? <Globe size={16} /> : <Hash size={16} />}
                                        </div>
                                        {!isCollapsed && (
                                            <div className="flex flex-col items-start overflow-hidden flex-1">
                                                <span className="text-[13px] font-semibold truncate w-full">{topic.name}</span>
                                                {topic.description && (
                                                 <span className="text-[9px] text-muted/70 truncate w-full group-hover:text-muted transition-colors">
                                                        {topic.description}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {user?.role === 'admin' && !isCollapsed && (
                                             <button
                                                 onClick={(e) => { e.stopPropagation(); openEditTopic(topic); }}
                                                 className="p-1 rounded hover:bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-accent"
                                             >
                                                 <Settings size={12} />
                                             </button>
                                         )}
                                         {currentTopic?.id === topic.id && !isCollapsed && (
                                             <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-glow-sm" />
                                        )}
                                    </motion.button>
                                ))}
                        </div>
                    </div>

                    <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />


                    {/*
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#111] border border-[#1A1A1A] text-white hover:bg-[#161616] transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <Globe size={16} className="text-[#888] group-hover:text-white transition-colors shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">Global Chat</span>}
                        {(!isCollapsed || onlineCount > 0) && (
                            <div className={`${isCollapsed ? 'absolute top-2 right-2' : 'ml-auto'} w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white] animate-pulse`} />
                        )}
                    </motion.button>
                    */}

                    <motion.button
                        whileHover={{ scale: 1.02, x: isCollapsed ? 0 : 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAnnouncements(true)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                        title={isCollapsed ? "Announcements" : ""}
                    >
                        <Megaphone size={16} className="shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">Announcements</span>}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02, x: isCollapsed ? 0 : 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAppearance(true)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                        title={isCollapsed ? "Appearance" : ""}
                    >
                        <Palette size={16} className="shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">Appearance</span>}
                    </motion.button>

                    {user?.role === 'admin' && (
                        <>
                            <div className="my-4 h-px bg-border" />
                            {!isCollapsed && (
                                <div className="px-3 pb-2 text-[10px] font-bold text-error/70 uppercase tracking-wider flex items-center gap-2">
                                    <Shield size={10} />
                                    Admin Panel
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <button
                                    onClick={() => setShowCreateUser(true)}
                                    className="w-full p-2 hover:bg-[#1A1A1A] rounded-xl transition-colors group border border-transparent hover:border-[#333]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#333]">
                                            <UserPlus size={16} className="text-[#888]" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[13px] font-medium text-[#ccc]">Create User</p>
                                            <p className="text-[10px] text-[#666]">Add new accounts</p>
                                        </div>
                                    </div>
                                </button>

                                {/* Online Users Button */}
                                {/* Only for admin, which we are inside */}
                                <button
                                    onClick={handleGetOnlineUsers}
                                    className="w-full p-2 hover:bg-[#1A1A1A] rounded-xl transition-colors group border border-transparent hover:border-[#333]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#333]">
                                            <Activity size={16} className="text-[#888]" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[13px] font-medium text-[#ccc]">Online Users</p>
                                            <p className="text-[10px] text-[#666]">See who looks active</p>
                                        </div>
                                    </div>
                                </button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => { setShowManageUsers(true); loadUsers(); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-blue-500/70 hover:text-blue-500 hover:bg-blue-500/5 border border-transparent hover:border-blue-500/20 transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                                    title={isCollapsed ? "Manage Users" : ""}
                                >
                                    <Users size={16} className="shrink-0" />
                                    {!isCollapsed && <span className="text-sm font-medium">Manage Users</span>}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        if (confirm('Clear all chat history?')) {
                                            window.dispatchEvent(new CustomEvent('admin:clearChat'));
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500/70 hover:text-red-500 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                                    title={isCollapsed ? "Clear Chat" : ""}
                                >
                                    <Disc size={16} className="shrink-0" />
                                    {!isCollapsed && <span className="text-sm font-medium">Clear Chat</span>}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowLaunchAnnouncement(true)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-yellow-500/70 hover:text-yellow-500 hover:bg-yellow-500/5 border border-transparent hover:border-yellow-500/20 transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                                    title={isCollapsed ? "Launch Announcement" : ""}
                                >
                                    <Megaphone size={16} className="shrink-0" />
                                    {!isCollapsed && <span className="text-sm font-medium">Launch Announcement</span>}
                                </motion.button>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-3 mt-auto border-t border-[#1A1A1A] ${isCollapsed ? 'px-2' : ''}`}>
                    <motion.div
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors group cursor-pointer ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#222] to-[#111] border border-[#1A1A1A] flex items-center justify-center text-[#888] group-hover:text-white transition-colors shrink-0">
                            <span className="text-[10px] font-mono font-bold">
                                #{(user?.anonymousId || '0000').toString().slice(0, 2)}
                            </span>
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">@{user?.username || 'anonymous'}</p>
                                <p className="text-[10px] text-[#444] font-mono truncate uppercase">
                                    {user?.role === 'admin' ? '🔴 ADMIN' : `#${user?.anonymousId || 'UNKNOWN'}`}
                                </p>
                            </div>
                        )}
                        {!isCollapsed && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={logout}
                                className="p-1.5 text-[#444] hover:text-red-400 transition-colors"
                            >
                                <LogOut size={14} />
                            </motion.button>
                        )}
                    </motion.div>
                </div>
            </motion.div>

            {/* Create User Modal */}
            <AnimatePresence>
                {showCreateUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateUser(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0a0a0a] border border-[#1A1A1A] rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <UserPlus size={20} className="text-green-500" />
                                    Create New User
                                </h2>
                                <button onClick={() => setShowCreateUser(false)} className="text-[#666] hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-[#666] protocol-text mb-1 block">Username</label>
                                    <input
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#333]"
                                        placeholder="Enter username..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#666] protocol-text mb-1 block">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-[#333]"
                                            placeholder="Enter password..."
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
                                        >
                                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#666] protocol-text mb-1 block">Role</label>
                                    <select
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#333]"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                {createMessage && (
                                    <p className={`text-sm ${createMessage.startsWith('✓') ? 'text-green-500' : 'text-red-500'}`}>
                                        {createMessage}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="w-full bg-green-500 text-black font-bold py-3 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50"
                                >
                                    {createLoading ? 'Creating...' : 'Create User'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manage Users Modal */}
            <AnimatePresence>
                {showManageUsers && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowManageUsers(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0a0a0a] border border-[#1A1A1A] rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Users size={20} className="text-blue-500" />
                                    Manage Users
                                </h2>
                                <button onClick={() => setShowManageUsers(false)} className="text-[#666] hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mb-4 relative shrink-0">
                                <input
                                    type="text"
                                    placeholder="Search by username or ID..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-[#333]"
                                />
                                {userSearch && (
                                    <button
                                        onClick={() => setUserSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-white"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {listLoading ? (
                                    <p className="text-[#666] text-center py-4">Loading...</p>
                                ) : userList.filter(u =>
                                    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                                    String(u.anonymous_id).includes(userSearch)
                                ).length === 0 ? (
                                    <p className="text-[#666] text-center py-4">{userSearch ? 'No matches found' : 'No users found'}</p>
                                ) : (
                                    userList
                                        .filter(u =>
                                            u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                                            String(u.anonymous_id).includes(userSearch)
                                        )
                                        .map(u => (
                                            <div key={u.id} className="flex items-center justify-between p-3 bg-[#111] rounded-xl border border-[#1A1A1A] hover:border-[#222] transition-colors">
                                                <div>
                                                    <p className="text-white text-sm font-medium">@{u.username}</p>
                                                    <p className="text-[10px] text-[#666]">
                                                        #{u.anonymous_id} • {u.role === 'admin' ? '🔴 Admin' : 'User'}
                                                    </p>
                                                </div>
                                                {u.role !== 'admin' && (
                                                    <button
                                                        onClick={() => deleteUser(u.id)}
                                                        className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Announcements Modal */}
            <AnimatePresence>
                {showAnnouncements && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAnnouncements(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0a0a0a] border border-[#1A1A1A] rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col max-h-[80vh]"
                        >
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Megaphone size={20} className="text-yellow-500" />
                                    Announcements
                                </h2>
                                <button onClick={() => setShowAnnouncements(false)} className="text-[#666] hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                                {announcementLoading ? (
                                    <p className="text-[#444] text-[10px] protocol-text animate-pulse">Fetching records...</p>
                                ) : announcements.length === 0 ? (
                                    <p className="text-[#444] text-[10px] protocol-text text-center py-8">No broadcasts recorded.</p>
                                ) : (
                                    announcements.map(ann => (
                                        <div key={ann.id} className="p-4 bg-[#111] rounded-xl border border-[#1A1A1A] hover:border-yellow-500/20 transition-colors group">
                                            <p className="text-[9px] text-[#555] protocol-text mb-2 group-hover:text-yellow-500/50 transition-colors">
                                                {new Date(ann.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                            <p className="text-sm text-[#ccc] leading-relaxed">{ann.content}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Create Topic Modal */}
            <AnimatePresence>
                {showCreateTopic && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateTopic(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0a0a0a] border border-[#1A1A1A] rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Hash size={20} className="text-white" />
                                    Create New Channel
                                </h2>
                                <button onClick={() => setShowCreateTopic(false)} className="text-[#666] hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTopic} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-[#666] protocol-text mb-1 block">Channel Name</label>
                                    <input
                                        value={newTopicName}
                                        onChange={(e) => setNewTopicName(e.target.value)}
                                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#333]"
                                        placeholder="e.g. random"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#666] protocol-text mb-1 block">Description (Optional)</label>
                                    <input
                                        value={newTopicDesc}
                                        onChange={(e) => setNewTopicDesc(e.target.value)}
                                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#333]"
                                        placeholder="e.g. for random discussions"
                                    />
                                </div>

                                {createTopicMsg && (
                                    <p className={`text-[10px] protocol-text ${createTopicMsg.startsWith('✓') ? 'text-green-500' : 'text-red-500'}`}>
                                        {createTopicMsg}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={createTopicLoading}
                                    className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    {createTopicLoading ? 'Creating...' : 'Create Channel'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Launch Announcement Modal */}
            <AnimatePresence>
                {showLaunchAnnouncement && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowLaunchAnnouncement(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0a0a0a] border border-[#1A1A1A] rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Megaphone size={20} className="text-yellow-500" />
                                    Launch Announcement
                                </h2>
                                <button onClick={() => setShowLaunchAnnouncement(false)} className="text-[#666] hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleLaunchAnnouncement} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-[#666] protocol-text mb-1 block">Broadcast Content</label>
                                    <textarea
                                        value={newAnnouncement}
                                        onChange={(e) => setNewAnnouncement(e.target.value)}
                                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500/50 min-h-[120px] resize-none"
                                        placeholder="Type transmission..."
                                        required
                                    />
                                </div>

                                {launchMessage && (
                                    <p className={`text-[10px] protocol-text ${launchMessage.startsWith('✓') ? 'text-green-500' : 'text-red-500'}`}>
                                        {launchMessage}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={launchLoading}
                                    className="w-full bg-yellow-500 text-black font-extrabold py-3 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {launchLoading ? 'Transmitting...' : 'Initiate Broadcast'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Appearance Modal */}
            <AnimatePresence>
                {showAppearance && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAppearance(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0a0a0a] border border-[#1A1A1A] rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Palette size={20} />
                                    Appearance
                                </h2>
                                <button onClick={() => setShowAppearance(false)} className="text-[#666] hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-4">


                                <div className="flex items-center justify-between p-4 bg-[#111] rounded-xl border border-[#1A1A1A]">
                                    <div className="flex items-center gap-3">
                                        <Moon size={18} className="text-[#888]" />
                                        <span className="text-sm text-white">Dark Mode</span>
                                    </div>
                                    <div className="w-10 h-6 bg-white rounded-full flex items-center justify-end px-1">
                                        <div className="w-4 h-4 bg-black rounded-full" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[#111] rounded-xl border border-[#1A1A1A]">
                                    <div className="flex items-center gap-3">
                                        {notificationsEnabled ? <Bell size={18} className="text-[#888]" /> : <BellOff size={18} className="text-[#888]" />}
                                        <span className="text-sm text-white">Notifications</span>
                                    </div>
                                    <button
                                        onClick={toggleNotifications}
                                        className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${notificationsEnabled ? 'bg-white justify-end' : 'bg-[#333] justify-start'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full transition-colors ${notificationsEnabled ? 'bg-black' : 'bg-[#666]'}`} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Topic Modal */}
            <AnimatePresence>
                {showEditTopic && editingTopic && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowEditTopic(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-black border border-[#1A1A1A] rounded-2xl overflow-hidden"
                        >
                            <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
                                <h2 className="text-white font-bold">Edit Topic</h2>
                                <button onClick={() => setShowEditTopic(false)} className="text-[#444] hover:text-white"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleUpdateTopic} className="p-4 space-y-4">
                                <div>
                                    <label className="text-[10px] text-[#444] uppercase tracking-wider mb-1 block">Name</label>
                                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-3 py-2 text-white text-sm focus:border-white/20 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-[#444] uppercase tracking-wider mb-1 block">Description</label>
                                    <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-3 py-2 text-white text-sm focus:border-white/20 outline-none" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] text-[#444] uppercase tracking-wider mb-1 block">Accent</label>
                                        <input type="color" value={editAccentColor} onChange={e => setEditAccentColor(e.target.value)} className="w-full h-10 bg-[#111] border border-[#1A1A1A] rounded-lg cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[#444] uppercase tracking-wider mb-1 block">Background</label>
                                        <input type="color" value={editBgColor} onChange={e => setEditBgColor(e.target.value)} className="w-full h-10 bg-[#111] border border-[#1A1A1A] rounded-lg cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[#444] uppercase tracking-wider mb-1 block">Text</label>
                                        <input type="color" value={editTextColor} onChange={e => setEditTextColor(e.target.value)} className="w-full h-10 bg-[#111] border border-[#1A1A1A] rounded-lg cursor-pointer" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-[#444] uppercase tracking-wider mb-1 block">Username</label>
                                        <input type="color" value={editUsernameColor} onChange={e => setEditUsernameColor(e.target.value)} className="w-full h-10 bg-[#111] border border-[#1A1A1A] rounded-lg cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[#444] uppercase tracking-wider mb-1 block">Animation</label>
                                        <select value={editAnimation} onChange={e => setEditAnimation(e.target.value)} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-3 h-10 text-white text-sm focus:border-white/20 outline-none">
                                            <option value="none">None</option>
                                            <option value="pulse">Pulse</option>
                                            <option value="glow">Glow</option>
                                            <option value="shake">Shake</option>
                                        </select>
                                    </div>
                                </div>
                                {editMsg && <p className={`text-xs ${editMsg.startsWith('✓') ? 'text-green-500' : 'text-red-500'}`}>{editMsg}</p>}
                                <div className="flex gap-2">
                                    <button type="submit" disabled={editLoading} className="flex-1 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50">
                                        {editLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    {editingTopic.slug !== 'global' && (
                                        <button type="button" onClick={handleDeleteTopic} disabled={editLoading} className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-50">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Online Users Modal */}
            <AnimatePresence>
                {showOnlineUsers && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowOnlineUsers(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0A0A0A] border border-[#333] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-[#222] flex items-center justify-between">
                                <h3 className="text-[#fff] font-medium flex items-center gap-2">
                                    <Activity size={18} className="text-green-500" />
                                    Online Users
                                </h3>
                                <button
                                    onClick={() => setShowOnlineUsers(false)}
                                    className="p-1 hover:bg-[#222] rounded-full text-[#666] hover:text-[#fff] transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-0 max-h-[60vh] overflow-y-auto">
                                {onlineUsersLoading ? (
                                    <div className="p-8 text-center text-[#666]">
                                        <p className="animate-pulse">Scanning frequencies...</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[#222]">
                                        {onlineUsersList.map(u => (
                                            <div key={u.id} className="p-4 flex items-center justify-between group hover:bg-[#111] transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#333] text-[#ccc] font-medium font-mono text-sm relative">
                                                        {u.username.substring(0, 2).toUpperCase()}
                                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#0A0A0A]"></div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-[#eee]">{u.username}</p>
                                                        <p className="text-xs text-[#666] font-mono">Anonymous ID: #{u.anonymousId}</p>
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${u.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[#222] text-[#888] border-[#333]'}`}>
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </div>
                                        ))}
                                        {onlineUsersList.length === 0 && (
                                            <div className="p-8 text-center text-[#666]">
                                                <p>No active signals detected.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-[#111] border-t border-[#222] text-center">
                                <p className="text-[10px] text-[#555] font-mono">
                                    TOTAL ACTIVE SIGNALS: {onlineUsersList.length}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </>
    );
}
