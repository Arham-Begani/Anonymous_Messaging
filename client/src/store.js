import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(persist((set) => ({
    user: null,
    isAuthenticated: false,
    messages: [],
    isConnected: false,
    typingUsers: 0,
    onlineCount: 0,

    topics: [],
    currentTopic: null, // {id, name, slug, description}


    login: (userData) => {
        set({
            user: {
                id: userData.userId,
                username: userData.username,
                token: userData.token,
                anonymousId: userData.anonymousId,
                displayName: `Anonymous User #${userData.anonymousId}`,
                role: userData.role
            },
            isAuthenticated: true
        });
    },
    logout: () => set({ user: null, isAuthenticated: false, messages: [] }),

    setConnected: (status) => set({ isConnected: status }),

    setMessages: (messages) => set({ messages }),

    addMessage: (msg) => set((state) => {
        if (state.messages.some(m => m.id === msg.id)) return state;
        return { messages: [...state.messages, msg] };
    }),

    updateMessage: (id, updates) => set((state) => ({
        messages: state.messages.map(m => m.id === id ? { ...m, ...updates } : m)
    })),

    setTypingUsers: (count) => set({ typingUsers: count }),

    setOnlineCount: (count) => set({ onlineCount: count }),

    setTopics: (topics) => set({ topics }),
    setCurrentTopic: (topic) => set({ currentTopic: topic }),
    addTopic: (topic) => set((state) => {
        if (state.topics.some(t => t.id === topic.id)) return state;
        return { topics: [...state.topics, topic] };
    }),
    updateTopic: (topic) => set((state) => ({
        topics: state.topics.map(t => t.id === topic.id ? topic : t),
        currentTopic: state.currentTopic?.id === topic.id ? topic : state.currentTopic
    })),
    deleteTopic: (topicId) => set((state) => {
        const newTopics = state.topics.filter(t => t.id !== topicId);
        return {
            topics: newTopics,
            currentTopic: state.currentTopic?.id === topicId ? (newTopics.find(t => t.slug === 'global') || newTopics[0] || null) : state.currentTopic
        };
    }),

    announcements: [],
    setAnnouncements: (announcements) => set({ announcements }),
    addAnnouncement: (ann) => set((state) => {
        if (state.announcements.some(a => a.id === ann.id)) return state;
        return { announcements: [ann, ...state.announcements] };
    }),

    tenorApiKey: 'AIzaSyAMjD_Xz6RQ9GbtZ3KrhSBVrAR6st97Lu4',
    setTenorApiKey: (key) => set({ tenorApiKey: key }),

    notificationsEnabled: true,
    toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
}), {
    name: 'anon-chat-storage',
    partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        notificationsEnabled: state.notificationsEnabled
    }),
}));
