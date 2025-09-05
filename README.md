# Desktop Todo App

A simple, always-on-top desktop todo list built with Electron.

## Features

- **Always visible**: Stays on top of all windows
- **System tray**: Minimize to tray, never fully closes
- **Auto-save**: Your todos are saved automatically
- **Zoomable**: Adjust font size for comfort
- **Dark/Light theme**: Follows system preference

## Usage

### Keyboard Shortcuts

- `Alt + P` - Show/hide window
- `Ctrl + Mouse Wheel` - Zoom in/out
- `Ctrl + =` - Zoom in
- `Ctrl + 0` - Reset zoom
- `Tab` - Add indentation

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the app: `npm run dev`

### Build

- `npm run build` - Build for current platform
- `npm run build:win` - Build for Windows
- `npm run build:mac` - Build for macOS

## Data Storage

Your todos are automatically saved to your system's user data directory as a plain text file.
