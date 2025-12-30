import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(persist((set) => ({
    user: null,
    isAuthenticated: false,
    messages: [],
    isConnected: false,
    typingUsers: 0,
    onlineCount: 0,

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
}), {
    name: 'anon-chat-storage',
    partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
}));
