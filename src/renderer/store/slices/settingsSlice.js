/**
 * Settings Store Slice
 * Handles model selection and user preferences
 */
export const createSettingsSlice = (set, get) => ({
  // State
  selectedModel: "claude-4-sonnet",
  models: [
    { id: "claude-4-sonnet", name: "Claude 4 Sonnet" }
    // { id: "O3", name: "O3" },
  ],

  // Actions
  setSelectedModel: (model) => set({ selectedModel: model }),

  // Model management
  addModel: (model) =>
    set((state) => ({
      models: [...state.models, model]
    })),

  removeModel: (modelId) =>
    set((state) => ({
      models: state.models.filter((m) => m.id !== modelId)
    })),

  getModelById: (modelId) => {
    const { models } = get()
    return models.find((m) => m.id === modelId)
  },

  getSelectedModelInfo: () => {
    const { selectedModel, getModelById } = get()
    return getModelById(selectedModel)
  }
})

export default createSettingsSlice
