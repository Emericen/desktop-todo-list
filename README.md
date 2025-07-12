# electron-template

An Electron application with React and AI agent integration.

## Quick Start

### Install

This project uses both Node.js and Python, so you'll need to set up a Python virtual environment first.

**Windows:**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
npm install
```

**macOS/Linux:**
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
npm install
```

Note: The `npm install` command will also trigger the Python package installation process.

### Development

```bash
npm run dev
```

### Testing

```bash
npm run test
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## Current Limitations

V1 introduced some limitations due to prioritizing faster time to market. In no particular order, here are the list of problems.

- You can double submit. You can submit query while the last query's answer is generating and you'll see tokens from 2 streams.
- Message UI components are not standardized. We should use the right shadcn components for visual consistency and our `className` should only be layout and positional.
  - I think I should learn css but specifically layout / positional.
- All screenshots are resized to exactly 1280x720 pixels regardless of actual monitor dimensions. While sizing down is standard in CV, ultra-wide monitors (21:9, 32:9) and portrait monitors may experience stretching
- No zoom functionality: Since images are sized down to 1280x720, large monitors with small UI elements may be difficult to identify for the agent. We can add zoom in and out tool for agent but we decided to deprioritize this for V1.


Also, here's a list of potential future work that does not block experience.

- We can migrate AI and OS logic to Python entirely and use FastAPI (which supports both HTTP and Websocket). We can keep pushing events to FE while using [keyring](https://github.com/jaraco/keyring) to store secrets.Lastly, here are the immediate todos.


## TODO

- Agent **loop**.
- [Experiment] plan & list of actions first -> user approve -> hide window -> execute actions in multiple turns -> show window.

