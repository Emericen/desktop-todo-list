# Lychee Desktop Assistant

An AI-powered desktop assistant that lives on top of your screen, sees what you see, and can take action on your behalf with mouse, keyboard, and terminal access.

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- An Anthropic API key

### Install

```bash
# Install dependencies
npm install
```

### Setup

1. Create a `.env` file in the root directory
2. Add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_api_key_here
```

### Development

```bash
npm run dev
```

### Build

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

## How to Use

1. **Open/Close**: Press `Alt+P` to show/hide the chat window
2. **Voice Input**: Press `Alt+\` to start/stop voice transcription
3. **Type or speak** your request and the AI will:
   - Take screenshots to see your screen
   - Execute terminal commands (with your approval)
   - Control mouse and keyboard
   - Navigate applications and websites

## Current Limitations

- You can double submit queries while a previous one is still generating
- Message UI components could be more standardized with consistent shadcn usage
- All screenshots are resized to 1280x720 pixels regardless of monitor dimensions
- Ultra-wide monitors (21:9, 32:9) and portrait monitors may experience stretching
- No zoom functionality for better element identification on large monitors

## Future Work

- Agent planning: Show list of planned actions → user approval → execute in background
- Enhanced screenshot handling for different monitor aspect ratios
- Zoom tools for better UI element detection
- More sophisticated action chaining and workflows

## Architecture

- **Frontend**: React + Electron renderer with shadcn/ui components
- **Backend**: Electron main process with Anthropic Claude integration
- **AI Tools**: Screenshot capture, mouse/keyboard control, terminal execution
- **Voice**: OpenAI Whisper for speech-to-text transcription
