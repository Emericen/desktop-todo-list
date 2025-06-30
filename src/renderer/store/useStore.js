import { create } from "zustand";

// Global UI store (frontend-only)
// Holds non-persistent app state such as theme, in-app shortcuts, chat messages, etc.
// Settings are hydrated from the backend on startup and kept in sync via the `settings-updated` channel.

const useStore = create((set, get) => ({
  settings: null,
  messages: [],
  isTranscribing: false,
  awaitingUserResponse: false,
  selectedModel: "claude-4-sonnet",

  // Load settings from main process
  loadSettings: async () => {
    try {
      if (window.api?.getSettings) {
        const settings = await window.api.getSettings();
        set({ settings });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  // Replace the last image message with a new one, or add if no image exists
  replaceLastImageMessage: (message) =>
    set((state) => {
      if (
        state.messages.length !== 0 &&
        state.messages[state.messages.length - 1].type === "image"
      ) {
        return {
          messages: [...state.messages.slice(0, -1), message],
        };
      }
      return { messages: [...state.messages, message] };
    }),

  clearMessages: () => set({ messages: [] }),

  setIsTranscribing: (val) => set({ isTranscribing: val }),

  setAwaitingUserResponse: (val) => set({ awaitingUserResponse: val }),

  submitQuery: async (rawQuery) => {
    const query = rawQuery.trim();
    if (!query) return;

    get().addMessage({
      type: "user",
      content: query,
      timestamp: new Date(),
    });

    try {
      const res = await window.api.sendQuery({ prompt: query });
      const content = res.data || res.message || JSON.stringify(res);
      get().addMessage({
        type: "text",
        content: content,
        timestamp: new Date(),
      });
    } catch (error) {
      get().addMessage({
        type: "text",
        content: `Error: ${error}`,
        timestamp: new Date(),
      });
    }
  },

  setSelectedModel: (model) => set({ selectedModel: model }),
}));

// Attach backend-push listener globally once store is defined
if (typeof window !== "undefined" && window.api?.onPush) {
  window.api.onPush((payload) => {
    console.log("payload", payload);
    const message = {
      type: payload.type,
      content: payload.content,
      timestamp: new Date(),
    };

    // Handle different message types for screenshot flow
    if (payload.type === "image") {
      useStore.getState().replaceLastImageMessage(message);
    } else {
      useStore.getState().addMessage(message);
    }
  });
}

export default useStore;
