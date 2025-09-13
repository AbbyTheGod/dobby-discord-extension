# Dobby AI - Discord Reply Assistant

A Chrome extension that generates intelligent AI replies for Discord messages using Fireworks AI and the Dobby 8B model. Simply lock a message and get 3 contextual reply suggestions!

![Dobby AI Logo](dobby.png)

## Features

- **Smart Message Locking**: Ctrl+Click to lock any Discord message
- **AI-Powered Replies**: Generate 3 different contextual responses using Dobby 8B
- **Discord-Native UI**: Seamlessly integrated dropdown in Discord's top-right corner
- **Regenerate Options**: Get fresh replies with the regenerate button
- **One-Click Copy**: Copy any reply to clipboard instantly
- **Draggable Interface**: Move the reply dropdown anywhere on screen
- **Real-Time Generation**: Fast, human-like responses without emojis
- **Easy Setup**: Simple configuration with Fireworks AI API key

## 🚀 Quick Start

### Installation

1. **Download the Extension**
   - Go to the GitHub repository and click **"Code" → "Download ZIP"**
   - **Extract the ZIP file** to a folder on your computer (e.g., Desktop or Downloads)
   - You should see a folder with files like `manifest.json`, `content.js`, etc.

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the **unpacked extension folder**
   - Dobby AI icon appears in your toolbar

3. **Get API Key**
   - Visit [Fireworks AI](https://app.fireworks.ai/)
   - Create account and get your API key
   - Keys start with `fw`

4. **Configure Extension**
   - Click the Dobby AI icon in Chrome toolbar
   - Enter your Fireworks API key
   - Toggle "Hover Reply Enabled" to ON
   - Click "Save Config"

### Usage

1. **Lock a Message**
   - **Ctrl+Click** on any Discord message
   - Blue border appears around the locked message
   - "🔒 Locked to this message" notification shows

2. **Generate Replies**
   - Hover over the locked message
   - AI generates 3 different reply options
   - Dropdown appears in top-right corner

3. **Use Replies**
   - Click "Copy Reply" next to any response you like
   - Paste with **Ctrl+V** in Discord's message input
   - Press **Enter** to send normally

4. **Regenerate (Optional)**
   - Click "🔄 Regenerate" for fresh reply options
   - Get different responses for the same message

## 🎛️ Configuration

### Extension Popup Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Hover Reply Enabled** | Master toggle for the extension | OFF |
| **Fireworks API Key** | Your API key from Fireworks AI | Required |
| **Test Connection** | Verify API key works | Manual |

### AI Model Settings

- **Model**: `accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b`
- **Max Tokens**: 25 (short, concise replies)
- **Temperature**: 0.8 (balanced creativity)
- **Response Style**: Human-like, no emojis, contextual

## 🏗️ Technical Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Discord.com   │    │   Content Script │    │ Background Script│
│                 │◄──►│   (content.js)   │◄──►│ (background.js) │
│  - Message DOM  │    │                  │    │                 │
│  - UI Injection │    │  - Hover Events  │    │  - API Calls    │
│  - User Input   │    │  - Reply Display │    │  - Fireworks AI │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌──────────────────┐
                       │   Popup UI       │
                       │  (popup.html)    │
                       │                  │
                       │  - API Key Setup │
                       │  - Toggle Bot    │
                       │  - Test Config   │
                       └──────────────────┘
```

### File Structure

```
dobby-ai-discord/
├── 📄 manifest.json          # Extension configuration & permissions
├── 🎨 popup.html             # Extension popup interface
├── ⚡ popup.js               # Popup functionality & settings
├── 🎯 content.js             # Main Discord interaction script
├── 🔧 background.js          # API communication handler
├── 🖼️ dobby.png              # Custom Dobby AI logo
└── 📖 README.md              # This documentation
```


## 🐛 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| **Extension not working** | Check if enabled in `chrome://extensions/` |
| **No replies generated** | Verify API key and credits at Fireworks AI |
| **UI not appearing** | Refresh Discord page, check console errors |
| **Can't copy replies** | Ensure clipboard permissions are granted |

### Debug Steps

1. **Check Extension Status**
   ```
   chrome://extensions/ → Dobby AI → Details → Inspect views
   ```

2. **Verify API Connection**
   ```
   Extension popup → Test Connection button
   ```

3. **Console Debugging**
   ```
   Discord.com → F12 → Console → Look for "Dobby AI" logs
   ```

4. **Reset Extension**
   ```
   chrome://extensions/ → Dobby AI → Remove → Reload
   ```

## 📋 Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Interact with Discord tabs |
| `storage` | Save user settings (API key, preferences) |
| `scripting` | Inject content scripts into Discord |
| `host_permissions` | Access Discord.com domains |

## 📞 Support

Need help? Here's where to get support:

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/AbbyTheGod/dobby-discord-extension/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/AbbyTheGod/dobby-discord-extension/discussions)

---

<div align="center">

**Made with ❤️ for the Discord community**

[⭐ Star this repo](https://github.com/AbbyTheGod/dobby-discord-extension) | [🐛 Report Bug](https://github.com/AbbyTheGod/dobby-discord-extension/issues) | [💡 Request Feature](https://github.com/AbbyTheGod/dobby-discord-extension/discussions)

</div>