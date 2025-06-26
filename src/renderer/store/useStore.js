import { create } from "zustand";

// Global UI store (frontend-only)
// Holds non-persistent app state such as theme, in-app shortcuts, chat messages, etc.
// Settings are hydrated from the backend on startup and kept in sync via the `settings-updated` channel.

let listenersAttached = false;

const useStore = create((set, get) => {
  // ===== Initial state =====
  const initialState = {
    // Backend-driven settings (theme, chat shortcuts, etc.)
    settings: null,

    // Chat state
    messages: [
      {
        role: "agent",
        type: "text",
        content: "Welcome! Here's a demo of the new ResponseActions component.",
        timestamp: new Date(),
      },
      {
        role: "agent",
        type: "image",
        content:
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRlbW8gU2NyZWVuc2hvdCBJbWFnZTwvdGV4dD4KICA8Y2lyY2xlIGN4PSI4MCIgY3k9IjgwIiByPSIyMCIgZmlsbD0iIzM5OGVmNCIvPgogIDxyZWN0IHg9IjMwMCIgeT0iMTIwIiB3aWR0aD0iODAiIGhlaWdodD0iNDAiIGZpbGw9IiNmNTk4NDIiLz4KPC9zdmc+",
        timestamp: new Date(),
      },
      {
        role: "agent",
        type: "text",
        content:
          "Here's the same image again to show how actions appear only at the end of agent sequences:",
        timestamp: new Date(),
      },
      {
        role: "agent",
        type: "image",
        content:
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRlbW8gU2NyZWVuc2hvdCBJbWFnZTwvdGV4dD4KICA8Y2lyY2xlIGN4PSI4MCIgY3k9IjgwIiByPSIyMCIgZmlsbD0iIzM5OGVmNCIvPgogIDxyZWN0IHg9IjMwMCIgeT0iMTIwIiB3aWR0aD0iODAiIGhlaWdodD0iNDAiIGZpbGw9IiNmNTk4NDIiLz4KPC9zdmc+",
        timestamp: new Date(),
      },
    ],
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
    submitQuery: async (rawQuery) => {
      const query = rawQuery.trim();
      if (!query) return;

      // Add user message locally
      get().addMessage({
        type: "user",
        content: query,
        timestamp: new Date(),
      });

      try {
        window.api.send({
          action: "submit_query",
          messages: get().messages,
        });
      } catch (error) {
        get().addMessage({
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

  // ===== Internal helpers =====
  const attachIpc = () => {
    if (listenersAttached || typeof window === "undefined" || !window.api)
      return;

    window.api.onMessage((payload) => {
      if (payload.type === "settings") {
        set({ settings: payload.data });
        return;
      }

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
      return;
    });

    // Request initial settings
    window.api.send({ action: "get_user_settings" });

    listenersAttached = true;
  };

  // Attach once
  attachIpc();

  return initialState;
});

export default useStore;
