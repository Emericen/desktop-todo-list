import { create } from "zustand";

// Global UI store (frontend-only)
// Holds non-persistent app state such as theme, in-app shortcuts, chat messages, etc.
// Settings are hydrated from the backend on startup and kept in sync via the `settings-updated` channel.

const useStore = create((set, get) => ({
  settings: null,
  messages: [],
  isTranscribing: false,
  awaitingUserResponse: false,

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  setIsTranscribing: (val) => set({ isTranscribing: val }),

  setAwaitingUserResponse: (val) => set({ awaitingUserResponse: val }),

  submitQuery: async (rawQuery) => {
    const query = rawQuery.trim();
    if (!query) return;

    get().addMessage({
      role: "user",
      type: "text",
      content: query,
      timestamp: new Date(),
    });

    try {
      const res = await window.api.sendQuery({ prompt: query });
      const content = res.data || res.message || JSON.stringify(res);
      get().addMessage({
        role: "agent",
        type: "text",
        content,
        timestamp: new Date(),
      });
    } catch (error) {
      get().addMessage({
        role: "agent",
        type: "text",
        content: `Error: ${error}`,
        timestamp: new Date(),
      });
    }
  },
}));

export default useStore;
