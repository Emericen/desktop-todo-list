import { create } from "zustand";

// Global UI store (frontend-only)
// Holds non-persistent app state such as theme, in-app shortcuts, chat messages, etc.
// Settings are hydrated from the backend on startup and kept in sync via the `settings-updated` channel.

let listenersAttached = false;

const useStore = create((set, get) => {
  // ===== Internal helpers =====
  const attachIpc = () => {
    if (listenersAttached || typeof window === "undefined" || !window.api)
      return;

    window.api.onMessage((payload) => {
      if (payload.type === "settings") {
        set({ settings: payload.data });
        return;
      }

      if (payload.type !== "response-stream") return;

      const response = payload.data;
      switch (response.type) {
        case "text":
          get().addMessage({
            role: "agent",
            type: "text",
            content: response.content,
            timestamp: new Date(),
          });
          break;
        case "image":
          get().addMessage({
            role: "agent",
            type: "image",
            content: response.content,
            timestamp: new Date(),
          });
          break;
        case "confirmation":
          get().setAwaitingUserResponse(true);
          get().addMessage({
            role: "agent",
            type: "confirmation",
            content: response.content,
            timestamp: new Date(),
          });
          break;
        case "error":
          get().addMessage({
            role: "agent",
            type: "text",
            content: `Error: ${response.content}`,
            timestamp: new Date(),
          });
          break;
        default:
          break;
      }
    });

    // Request initial settings
    window.api.send({ action: "get_user_settings" });

    listenersAttached = true;
  };

  // ===== Initial state =====
  const initialState = {
    // Backend-driven settings (theme, chat shortcuts, etc.)
    settings: null,

    // Chat state
    messages: [],
    isTranscribing: false,
    awaitingUserResponse: false,

    // Mutators
    setSettings: (settings) => set({ settings }),

    addMessage: (message) =>
      set((state) => ({ messages: [...state.messages, message] })),

    clearMessages: () => set({ messages: [] }),

    setIsTranscribing: (val) => set({ isTranscribing: val }),

    setAwaitingUserResponse: (val) => set({ awaitingUserResponse: val }),

    // Submit user input to backend and store via IPC
    submitQuery: async (input) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      // Add user message locally
      get().addMessage({
        role: "user",
        type: "text",
        content: trimmed,
        timestamp: new Date(),
      });

      try {
        window.api.send({
          action: "submit_query",
          query: trimmed,
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

    // User confirmation helpers
    userConfirmed: () => {
      window.api.send({ action: "user_confirmed" });
    },
    userDenied: () => {
      window.api.send({ action: "user_denied" });
    },
  };

  // Attach once
  attachIpc();

  return initialState;
});

export default useStore;
