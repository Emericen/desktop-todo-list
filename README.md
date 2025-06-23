# electron-template

An Electron application with React and AI agent integration.

## Quick Start

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Testing

```bash
$ npm run test
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

## Mock Mode for Development

For faster development and testing without AI dependencies, use mock mode:

```bash
# In .env file
MOCK_MODE=true
```

Mock mode allows you to:
- **Focus on UX** - Perfect the entire user experience without AI complexity
- **Develop offline** - Work without internet or GPU server access  
- **Test deterministically** - Same responses every time for reliable testing
- **Iterate faster** - No waiting for AI responses

### Creating Mock Data

1. **Record coordinates** from your desktop:
   ```bash
   cd experiments
   python s2_record_click.py
   ```

2. **Add to mock responses** in `tests/data/mockResponses.json`:
   ```json
   {
     "responses": [
       {
         "role": "assistant", 
         "content": "Thought: I'll click on the file.\nAction: click(start_box='<|box_start|>(855, 618)<|box_end|>')"
       }
     ]
   }
   ```

Mock responses simulate the full AI behavior including screenshots, action planning, confirmations, and task completion.
