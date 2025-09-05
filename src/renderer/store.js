import { create } from "zustand"

const useTodoStore = create((set, get) => ({
  // Todo state
  todoText: '',
  isLoaded: false,
  fontSize: 14, // Base font size in px

  // Actions
  setTodoText: (text) => set({ todoText: text }),

  // Zoom actions
  zoomIn: () => set((state) => ({ 
    fontSize: Math.min(state.fontSize + 2, 32) // Max 32px
  })),
  
  zoomOut: () => set((state) => ({ 
    fontSize: Math.max(state.fontSize - 2, 8) // Min 8px
  })),
  
  resetZoom: () => set({ fontSize: 14 }),

  loadTodo: async () => {
    try {
      const text = await window.api.loadTodoText()
      set({ todoText: text || '', isLoaded: true })
    } catch (error) {
      console.error('Failed to load todo text:', error)
      set({ todoText: '', isLoaded: true })
    }
  },

  saveTodo: async () => {
    const { todoText } = get()
    try {
      await window.api.saveTodoText(todoText)
    } catch (error) {
      console.error('Failed to save todo text:', error)
    }
  }
}))

export default useTodoStore