# Dobby AI - Discord Reply Assistant

A Chrome extension that generates intelligent AI replies for Discord messages using Fireworks AI and the Dobby 8B model. Simply lock a message and get 3 contextual reply suggestions!

![Dobby AI Logo](dobby.png)

## ✨ Features

- **🎯 Smart Message Locking**: Ctrl+Click or Right-Click to lock any Discord message
- **🤖 AI-Powered Replies**: Generate 3 different contextual responses using Dobby 8B
- **🎨 Discord-Native UI**: Seamlessly integrated dropdown in Discord's top-right corner
- **🔄 Regenerate Options**: Get fresh replies with the regenerate button
- **📋 One-Click Copy**: Copy any reply to clipboard instantly
- **🎮 Draggable Interface**: Move the reply dropdown anywhere on screen
- **⚡ Real-Time Generation**: Fast, human-like responses without emojis
- **🔧 Easy Setup**: Simple configuration with Fireworks AI API key

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
   - **Ctrl+Click** or **Right-Click** on any Discord message
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

## 🔧 Development

### Local Development Setup

1. **Download & Setup**
   - Go to GitHub repository and click **"Code" → "Download ZIP"**
   - **Extract the ZIP file** to a folder on your computer
   - You should see the project files (manifest.json, content.js, etc.)

2. **Load Extension**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" → select **unpacked project folder**

3. **Make Changes**
   - Edit files as needed
   - Click "Reload" button on extension
   - Test on Discord.com

4. **Debug**
   - Right-click extension icon → "Inspect popup"
   - Open Discord → F12 → Console tab
   - Check for error messages

### Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `lockToMessage()` | content.js | Locks a message for reply generation |
| `generateMultipleReplies()` | content.js | Creates 3 AI responses |
| `showReplyPreview()` | content.js | Displays reply dropdown UI |
| `generateReply()` | background.js | Calls Fireworks AI API |
| `loadConfig()` | popup.js | Loads user settings |

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

## 🤝 Contributing

We welcome contributions! Here's how to help:

1. **Fork the Repository**
   ```bash
   git fork https://github.com/yourusername/dobby-ai-discord
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Follow existing code style
   - Add comments for complex logic
   - Test thoroughly on Discord

4. **Submit Pull Request**
   - Describe your changes
   - Include screenshots if UI changes
   - Reference any related issues

### Development Guidelines

- **Code Style**: Use existing patterns and formatting
- **Testing**: Test on multiple Discord message types
- **Documentation**: Update README for new features
- **Performance**: Keep API calls minimal and efficient

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Fireworks AI** for providing the Dobby 8B model
- **Discord** for the amazing platform
- **Open Source Community** for inspiration and tools

## 📞 Support

Need help? Here's where to get support:

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/yourusername/dobby-ai-discord/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/yourusername/dobby-ai-discord/discussions)
- **📧 Contact**: [Your Email](mailto:your-email@example.com)

## 🔄 Changelog

### Version 1.0.0 (Current)
- ✅ Initial release with core functionality
- ✅ Message locking with Ctrl+Click/Right-Click
- ✅ AI reply generation with Dobby 8B model
- ✅ Discord-native UI integration
- ✅ Copy-to-clipboard functionality
- ✅ Regenerate button for fresh replies
- ✅ Draggable dropdown interface
- ✅ Fireworks AI API integration

### Planned Features
- 🔄 Multiple AI model support
- 🎨 Custom reply templates
- 📊 Usage analytics
- 🌍 Multi-language support
- ⚡ Keyboard shortcuts
- 🎯 Smart reply filtering

---

<div align="center">

**Made with ❤️ for the Discord community**

[⭐ Star this repo](https://github.com/yourusername/dobby-ai-discord) | [🐛 Report Bug](https://github.com/yourusername/dobby-ai-discord/issues) | [💡 Request Feature](https://github.com/yourusername/dobby-ai-discord/discussions)

</div>