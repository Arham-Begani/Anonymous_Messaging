import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Users, Megaphone, Palette, LogOut, Disc, X, Moon, Bell, BellOff, Shield, UserPlus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
    const { user, logout, onlineCount, announcements, setAnnouncements, notificationsEnabled, toggleNotifications } = useStore();
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const [showAppearance, setShowAppearance] = useState(false);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showManageUsers, setShowManageUsers] = useState(false);
    // const [notifications, setNotifications] = useState(true); // Removed local state

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
            setCreateMessage('✗ Failed to create user');
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
            console.error('Failed to load users');
        }
        setListLoading(false);
    };

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

    useEffect(() => {
        loadAnnouncements();
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
                    fixed md:relative h-full bg-black border-r border-[#1A1A1A] flex flex-col z-30 font-sans transition-all duration-300 ease-in-out
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
                            className="w-8 h-8 bg-[#111] border border-[#1A1A1A] rounded-lg flex items-center justify-center shrink-0"
                        >
                            <Disc size={18} className="text-white" />
                        </motion.div>
                        {!isCollapsed && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">
                                <h1 className="font-bold text-white tracking-tight text-sm uppercase">Backrow</h1>
                                <p className="text-[9px] text-[#555] protocol-text">V2.5.0</p>
                            </motion.div>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-2 -mr-2 md:hidden text-[#444] hover:text-white transition-colors"
                            aria-label="Close sidebar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Menu */}
                <div className={`flex-1 px-3 py-6 space-y-1 overflow-y-auto ${isCollapsed ? 'px-2' : ''}`}>
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

                    <div className={`px-3 py-2.5 flex items-center gap-3 text-[#666] ${isCollapsed ? 'justify-center px-0' : ''}`}>
                        <Users size={16} className="shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">{onlineCount || 0} Online</span>}
                    </div>

                    <div className="my-4 h-px bg-[#111]" />

                    <motion.button
                        whileHover={{ scale: 1.02, x: isCollapsed ? 0 : 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAnnouncements(true)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#888] hover:text-white hover:bg-[#111] transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                        title={isCollapsed ? "Announcements" : ""}
                    >
                        <Megaphone size={16} className="shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">Announcements</span>}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02, x: isCollapsed ? 0 : 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAppearance(true)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#888] hover:text-white hover:bg-[#111] transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                        title={isCollapsed ? "Appearance" : ""}
                    >
                        <Palette size={16} className="shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">Appearance</span>}
                    </motion.button>

                    {user?.role === 'admin' && (
                        <>
                            <div className="my-4 h-px bg-[#111]" />
                            {!isCollapsed && (
                                <div className="px-3 pb-2 text-[10px] font-bold text-red-500/50 protocol-text uppercase tracking-widest flex items-center gap-2">
                                    <Shield size={10} />
                                    Admin Panel
                                </div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowCreateUser(true)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-green-500/70 hover:text-green-500 hover:bg-green-500/5 border border-transparent hover:border-green-500/20 transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                                title={isCollapsed ? "Create User" : ""}
                            >
                                <UserPlus size={16} className="shrink-0" />
                                {!isCollapsed && <span className="text-sm font-medium">Create User</span>}
                            </motion.button>

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
        </>
    );
}
