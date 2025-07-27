import fs from 'fs'
import path from 'path'
import { app } from 'electron'

/**
 * User Settings - Simple persistent configuration management
 * Stores user preferences in JSON file in userData directory
 */
class UserSettings {
  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json')
    this.defaults = {
      window: {
        width: 540,
        height: 720,
        alwaysOnTop: true,
        autoHide: true,
        resizable: false,
        skipTaskbar: true
      },
      shortcuts: {
        toggleChat: 'Alt+P'
      },
      theme: 'system', // system, light, dark
      screenshot: {
        maxHeight: 720
      }
    }
    this.settings = this.load()
  }

  /**
   * Load settings from file, fallback to defaults
   * @returns {Object} Loaded settings merged with defaults
   */
  load() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const loaded = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'))
        return { ...this.defaults, ...loaded } // Merge with defaults
      }
    } catch (error) {
      console.warn('Failed to load settings:', error)
    }
    return { ...this.defaults }
  }

  /**
   * Save current settings to file
   */
  save() {
    try {
      // Ensure the directory exists
      const dir = path.dirname(this.settingsPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  /**
   * Get a setting value using dot notation
   * @param {string} key - Setting key (e.g., 'window.width')
   * @returns {*} Setting value
   */
  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this.settings)
  }

  /**
   * Set a setting value using dot notation
   * @param {string} key - Setting key (e.g., 'window.width')
   * @param {*} value - Setting value
   */
  set(key, value) {
    const keys = key.split('.')
    const lastKey = keys.pop()
    const target = keys.reduce((obj, k) => obj[k] = obj[k] || {}, this.settings)
    target[lastKey] = value
    this.save()
  }

  /**
   * Get all settings
   * @returns {Object} All settings
   */
  getAll() {
    return { ...this.settings }
  }

  /**
   * Reset settings to defaults
   */
  reset() {
    this.settings = { ...this.defaults }
    this.save()
  }

  /**
   * Update multiple settings at once
   * @param {Object} updates - Object with setting updates
   */
  update(updates) {
    this.settings = { ...this.settings, ...updates }
    this.save()
  }

  /**
   * Get the path where settings are stored
   * @returns {string} Settings file path
   */
  getSettingsPath() {
    return this.settingsPath
  }
}

export default UserSettings