import React, { useState, useEffect, useCallback } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset
} from "../components/ui/sidebar"
import useStore from "../store/useStore"
import {
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  CreditCardIcon,
  ShieldIcon,
  ComputerIcon,
  PaletteIcon,
  SlidersIcon
} from "lucide-react"

export default function SettingsWindow() {
  const { settings, theme, setTheme, loadSettings, applyTheme } = useStore()
  const [activeSection, setActiveSection] = useState("defaults")

  // Local state for form values
  const [formData, setFormData] = useState({
    anthropicApiKey: "",
    openaiApiKey: "",
    toggleOpenHotKey: "Alt+P",
    toggleTranscriptionHotKey: "Alt+T"
  })

  // Debounced auto-save function
  const autoSave = useCallback(
    debounce(async (settingsToSave) => {
      try {
        await window.api.updateSettings(settingsToSave)
        console.log("Settings auto-saved successfully")
      } catch (error) {
        console.error("Failed to auto-save settings:", error)
      }
    }, 500),
    []
  )

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Apply current theme on mount
  useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        anthropicApiKey: settings.anthropicApiKey || "",
        openaiApiKey: settings.openaiApiKey || "",
        toggleOpenHotKey: settings.globalShortcuts?.toggleWindow || "Alt+P",
        toggleTranscriptionHotKey:
          settings.globalShortcuts?.toggleTranscription || "Alt+T"
      }))
    }
  }, [settings])

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }

      // Auto-save the settings
      const settingsToSave = {
        anthropicApiKey: newData.anthropicApiKey,
        openaiApiKey: newData.openaiApiKey,
        toggleOpenHotKey: newData.toggleOpenHotKey,
        toggleTranscriptionHotKey: newData.toggleTranscriptionHotKey,
        globalShortcuts: {
          toggleWindow: newData.toggleOpenHotKey,
          toggleTranscription: newData.toggleTranscriptionHotKey
        }
      }

      autoSave(settingsToSave)

      return newData
    })
  }

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme)
    try {
      await window.api.updateSettings({ theme: newTheme })
      console.log("Theme auto-saved successfully")
    } catch (error) {
      console.error("Failed to auto-save theme:", error)
    }
  }

  const getThemeIcon = (themeValue) => {
    switch (themeValue) {
      case "light":
        return <SunIcon className="w-4 h-4" />
      case "dark":
        return <MoonIcon className="w-4 h-4" />
      default:
        return <MonitorIcon className="w-4 h-4" />
    }
  }

  const getThemeLabel = (themeValue) => {
    switch (themeValue) {
      case "light":
        return "Light"
      case "dark":
        return "Dark"
      default:
        return "System"
    }
  }

  const sidebarItems = [
    {
      title: "GENERAL",
      items: [
        { id: "defaults", label: "Defaults", icon: SlidersIcon },
        { id: "system", label: "System", icon: ComputerIcon },
        { id: "personalization", label: "Personalization", icon: PaletteIcon }
      ]
    },
    {
      title: "ACCOUNT",
      items: [
        { id: "account", label: "Account", icon: UserIcon },
        { id: "team", label: "Team", icon: UsersIcon },
        { id: "billing", label: "Plans and Billing", icon: CreditCardIcon },
        { id: "privacy", label: "Data and Privacy", icon: ShieldIcon }
      ]
    }
  ]

  const renderDefaultsSection = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Defaults
        </h1>
        <p className="text-muted-foreground mb-8">
          Set default keyboard shortcuts and preferences for your assistant.
        </p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground">
                Set default keyboard shortcuts
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose your preferred keyboard shortcuts for using your
                assistant.
              </p>
            </div>
            <Button variant="outline" size="sm">
              Change shortcut
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="toggleOpenHotKey">Toggle Open Shortcut</Label>
              <Input
                id="toggleOpenHotKey"
                placeholder="Alt+P"
                value={formData.toggleOpenHotKey}
                onChange={(e) =>
                  handleInputChange("toggleOpenHotKey", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toggleTranscriptionHotKey">
                Toggle Transcription Shortcut
              </Label>
              <Input
                id="toggleTranscriptionHotKey"
                placeholder="Alt+T"
                value={formData.toggleTranscriptionHotKey}
                onChange={(e) =>
                  handleInputChange("toggleTranscriptionHotKey", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground">
                Set default microphone
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose your preferred microphone for voice input and
                transcription.
              </p>
            </div>
            <Button variant="outline" size="sm">
              Select microphone
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground">
                Set default language(s)
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose one or several default language for dictation.
              </p>
            </div>
            <Button variant="outline" size="sm">
              Set languages
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPersonalizationSection = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Personalization
        </h1>
        <p className="text-muted-foreground mb-8">
          Customize the look and feel of your assistant.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground mb-4">Theme</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select your preferred color theme.
          </p>
        </div>

        <div className="space-y-2 max-w-xs">
          <Label>Appearance</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  {getThemeIcon(theme)}
                  {getThemeLabel(theme)}
                </div>
                <ChevronDownIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-full">
              <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                <SunIcon className="w-4 h-4 mr-2" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                <MoonIcon className="w-4 h-4 mr-2" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange("system")}>
                <MonitorIcon className="w-4 h-4 mr-2" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )

  const renderAccountSection = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Account</h1>
        <p className="text-muted-foreground mb-8">
          Manage your API keys and account settings.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground mb-4">
            API Configuration
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Set up your AI service API keys for enhanced functionality.
          </p>
        </div>

        <div className="space-y-6 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="anthropicApiKey">Anthropic API Key</Label>
            <Input
              id="anthropicApiKey"
              type="password"
              placeholder="sk-ant-..."
              value={formData.anthropicApiKey}
              onChange={(e) =>
                handleInputChange("anthropicApiKey", e.target.value)
              }
            />
            <p className="text-xs text-muted-foreground">
              Required for Claude models. Get your key from{" "}
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
            <Input
              id="openaiApiKey"
              type="password"
              placeholder="sk-..."
              value={formData.openaiApiKey}
              onChange={(e) =>
                handleInputChange("openaiApiKey", e.target.value)
              }
            />
            <p className="text-xs text-muted-foreground">
              Required for voice transcription and OpenAI models. Get your key
              from{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                platform.openai.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderComingSoonSection = (title) => (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground mb-8">
          This section is coming soon.
        </p>
      </div>

      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p>Coming Soon</p>
      </div>
    </div>
  )

  const renderMainContent = () => {
    switch (activeSection) {
      case "defaults":
        return renderDefaultsSection()
      case "personalization":
        return renderPersonalizationSection()
      case "account":
        return renderAccountSection()
      case "system":
        return renderComingSoonSection("System")
      case "team":
        return renderComingSoonSection("Team")
      case "billing":
        return renderComingSoonSection("Plans and Billing")
      case "privacy":
        return renderComingSoonSection("Data and Privacy")
      default:
        return renderDefaultsSection()
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          <SidebarContent>
            {sidebarItems.map((section) => (
              <SidebarGroup key={section.title}>
                <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveSection(item.id)}
                          isActive={activeSection === item.id}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="flex flex-1 flex-col">
            <main className="flex-1 p-8 overflow-auto">
              {renderMainContent()}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

// Debounce utility function
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
