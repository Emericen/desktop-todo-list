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

## Current Limitations

- Does not work well on large monitors. Thus no windows / PC support yet.
- Typing is tricky since it clicks first.
  - When assistant `command + a` then type, it deselects and overlap the texts.
  - Assistant also have tendency to left click select text box first then type, whereas technically it could just type since it clicks already. Former is how human do things, so goes to say training data.

## Architecture

- **Frontend**: React + Electron renderer with shadcn/ui components
- **Backend**: Electron main process with Anthropic Claude integration
- **AI Tools**: Screenshot capture, mouse/keyboard control, terminal execution
- **Voice**: OpenAI Whisper for speech-to-text transcription
