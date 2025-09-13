// Dobby AI - Content Script
console.log('Dobby AI: Content script loaded');

class DiscordHoverBot {
  constructor() {
    this.hoveredMessage = null;
    this.isProcessing = false;
    this.replyPreview = null;
    this.lockedChat = null;
    this.lockedMessage = null;
    this.messageObserver = null;
    this.observerTimeout = null;
    this.eventListeners = new Set(); // Track event listeners for cleanup
    this.init();
  }

  async init() {
    // Wait for Discord to load
    await this.waitForDiscord();
    
    // Load configuration
    const config = await this.loadConfig();
    
    if (!config.botEnabled) {
      console.log('Bot is disabled');
      return;
    }

    // Start hover monitoring
    this.startHoverMonitoring();
    
    // Add fallback click detection for messages
    this.addClickFallback();
    
    // Listen for configuration changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.botEnabled) {
        if (changes.botEnabled.newValue) {
          this.startHoverMonitoring();
        } else {
          this.stopHoverMonitoring();
        }
      }
    });
  }

  async waitForDiscord() {
    return new Promise((resolve) => {
      const checkDiscord = () => {
        const messageList = document.querySelector('[data-list-id="chat-messages"]') || 
                           document.querySelector('[class*="messagesWrapper"]') ||
                           document.querySelector('[class*="scrollerInner"]');
        
        if (messageList) {
          console.log('Discord loaded, found message container');
          resolve();
        } else {
          setTimeout(checkDiscord, 1000);
        }
      };
      checkDiscord();
    });
  }

  async loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'fireworksApiKey',
        'webhookUrl',
        'replyPrompt',
        'replyDelay',
        'botEnabled'
      ], resolve);
    });
  }

  startHoverMonitoring() {
    console.log('Starting hover monitoring...');
    
    // Add hover event listeners to all existing messages
    this.addHoverListeners();
    
    // Monitor for new messages to add hover listeners
    const messageContainer = document.querySelector('[data-list-id="chat-messages"]') || 
                            document.querySelector('[class*="messagesWrapper"]') ||
                            document.querySelector('[class*="scrollerInner"]') ||
                            document.body;

    this.messageObserver = new MutationObserver((mutations) => {
      // Debounce to reduce lag
      clearTimeout(this.observerTimeout);
      this.observerTimeout = setTimeout(() => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Only process actual message elements
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if it's a message or contains messages
                if (node.classList && node.classList.toString().includes('message')) {
                  this.addHoverListenersToElement(node);
                } else {
                  // Check for messages inside the node
                  const messages = node.querySelectorAll('[class*="message"]:not([data-hover-bot-added])');
                  messages.forEach(msg => this.addHoverListenersToElement(msg));
                }
              }
            });
          }
        });
      }, 100); // 100ms debounce
    });

    this.messageObserver.observe(messageContainer, {
      childList: true,
      subtree: true
    });
  }

  stopHoverMonitoring() {
    if (this.messageObserver) {
      this.messageObserver.disconnect();
      this.messageObserver = null;
    }
    this.removeAllHoverListeners();
    console.log('Stopped hover monitoring');
  }

  addHoverListeners() {
    // More aggressive message selectors for different Discord layouts
    const selectors = [
      '[class*="message"]:not([data-hover-bot-added])',
      '[class*="messageListItem"]:not([data-hover-bot-added])',
      '[class*="messageGroup"]:not([data-hover-bot-added])',
      'li[class*="message"]:not([data-hover-bot-added])',
      'div[class*="message"]:not([data-hover-bot-added])',
      '[data-message-id]:not([data-hover-bot-added])',
      '[class*="messageContent"]:not([data-hover-bot-added])',
      '[class*="markup"]:not([data-hover-bot-added])'
    ];
    
    let messages = [];
    selectors.forEach(selector => {
      const found = document.querySelectorAll(selector);
      messages = messages.concat(Array.from(found));
    });
    
    // Remove duplicates
    messages = [...new Set(messages)];
    
    console.log(`Found ${messages.length} message elements to add listeners to`);
    messages.forEach(message => this.addHoverListenersToElement(message));
  }

  addHoverListenersToElement(element) {
    // More flexible message detection
    const hasMessageContent = element.querySelector('[class*="messageContent"]') || 
                             element.querySelector('[class*="markup"]') ||
                             element.querySelector('[class*="message"]') ||
                             element.textContent?.trim();
    
    if (!hasMessageContent) {
      return;
    }
    
    if (!element.hasAttribute('data-hover-bot-added')) {
      element.setAttribute('data-hover-bot-added', 'true');
      
      // Add tooltip to show Ctrl+Click instruction
      element.setAttribute('title', 'Ctrl+Click to lock this message and generate AI replies');
      
      console.log('Added hover listener to message element');
      
      // Use mouseover instead of mouseenter for better detection
      const mouseoverHandler = (e) => {
        console.log('Mouse over detected on:', element);
        // Only process if this is the locked message
        if (this.lockedMessage === element) {
          this.handleMessageHover(e, element);
        } else {
          console.log('Not locked message, just setting as hovered');
          this.hoveredMessage = element;
        }
      };
      
      const mouseoutHandler = (e) => {
        this.handleMessageLeave(e, element);
      };
      
      element.addEventListener('mouseover', mouseoverHandler, { passive: true });
      element.addEventListener('mouseout', mouseoutHandler, { passive: true });
      
      // Track event listeners for cleanup
      this.eventListeners.add({ element, event: 'mouseover', handler: mouseoverHandler });
      this.eventListeners.add({ element, event: 'mouseout', handler: mouseoutHandler });
    }
  }

  removeAllHoverListeners() {
    const messages = document.querySelectorAll('[data-hover-bot-added]');
    messages.forEach(message => {
      message.removeAttribute('data-hover-bot-added');
      // Note: We can't easily remove specific event listeners, but this is fine for our use case
    });
  }

  addClickFallback() {
    // Add click listener to document to detect message clicks
    document.addEventListener('click', (e) => {
      // Find the closest message element
      let messageElement = e.target.closest('[class*="message"]') || 
                          e.target.closest('[class*="messageListItem"]') ||
                          e.target.closest('[class*="messageGroup"]') ||
                          e.target.closest('[data-message-id]');
      
      if (messageElement) {
        if (!messageElement.hasAttribute('data-hover-bot-added')) {
          console.log('Click fallback: Found message element');
          this.addHoverListenersToElement(messageElement);
        }
        
        // Check if user wants to lock this message (Ctrl+Click or Right Click)
        if (e.ctrlKey || e.button === 2) {
          // Only prevent default for right-click, not Ctrl+Click
          if (e.button === 2) {
            e.preventDefault();
          }
          console.log('Ctrl+Click detected on message element:', messageElement);
          this.lockToMessage(messageElement);
          return;
        }
        
        // Regular click - just set as hovered for potential locking
        this.hoveredMessage = messageElement;
      }
    }, { passive: false }); // Changed to false to allow preventDefault
    
    // Add mouseover listener to document for better detection
    document.addEventListener('mouseover', (e) => {
      // Find the closest message element
      let messageElement = e.target.closest('[class*="message"]') || 
                          e.target.closest('[class*="messageListItem"]') ||
                          e.target.closest('[class*="messageGroup"]') ||
                          e.target.closest('[data-message-id]');
      
      if (messageElement && !messageElement.hasAttribute('data-hover-bot-added')) {
        console.log('Mouseover fallback: Found message element');
        this.addHoverListenersToElement(messageElement);
        // Just set as hovered for potential locking - don't generate replies
        this.hoveredMessage = messageElement;
      } else if (messageElement) {
        // Just set as hovered for potential locking
        this.hoveredMessage = messageElement;
      }
    }, { passive: true });
  }

  lockToMessage(messageElement) {
    // Clear previous lock
    if (this.lockedMessage) {
      this.lockedMessage.style.border = '';
      this.lockedMessage.style.borderRadius = '';
    }
    
    // Lock to this specific message
    this.lockedMessage = messageElement;
    this.lockedChat = messageElement;
    
    // Visual indicator for locked message
    messageElement.style.border = '2px solid #5865f2';
    messageElement.style.borderRadius = '8px';
    
    console.log('Locked to specific message');
    
    // Show notification
    this.showNotification('🔒 Locked to this message for auto-reply');
    
    // Generate replies for the locked message
    const message = this.parseMessageElement(messageElement);
    console.log('Parsed message:', message);
    
    if (message && message.content && message.content.trim()) {
      console.log('Message content found:', message.content);
      
      if (!this.isBotMessage(message)) {
        console.log('Not a bot message, generating replies...');
        this.showLoadingPreview(messageElement);
        this.generateMultipleReplies(message, messageElement);
      } else {
        console.log('Bot message detected, not generating replies');
        this.showNotification('⚠️ Cannot reply to bot messages');
      }
    } else {
      console.log('No message content found, trying fallback extraction...');
      
      // Fallback: try to extract content manually
      const fallbackContent = this.extractContentFallback(messageElement);
      if (fallbackContent && fallbackContent.trim()) {
        console.log('Fallback content found:', fallbackContent);
        const fallbackMessage = {
          id: this.generateMessageId(),
          content: fallbackContent,
          author: 'Unknown',
          isWebhook: false
        };
        
        this.showLoadingPreview(messageElement);
        this.generateMultipleReplies(fallbackMessage, messageElement);
      } else {
        console.log('No content found even with fallback');
        this.showNotification('⚠️ No message content found');
      }
    }
  }

  unlockMessage() {
    if (this.lockedMessage) {
      this.lockedMessage.style.border = '';
      this.lockedMessage.style.borderRadius = '';
      this.lockedMessage = null;
      this.lockedChat = null;
      console.log('Unlocked from message');
      this.showNotification('🔓 Unlocked from message');
    }
  }

  async handleMessageHover(event, messageElement) {
    console.log('Hover detected on message element');
    
    // Only process if we have a locked message and this is it
    if (this.lockedMessage && this.lockedMessage === messageElement) {
      console.log('Hovering over locked message');
      
      // Check if we already have replies showing for this message
      if (this.replyPreview && this.replyPreview.messageElement === messageElement) {
        console.log('Replies already showing for this message, skipping generation');
        return;
      }
      
      if (this.isProcessing) {
        console.log('Already processing, skipping');
        return;
      }
      
      this.hoveredMessage = messageElement;
      
      // Extract message content
      const message = this.parseMessageElement(messageElement);
      if (!message || !message.content.trim()) {
        console.log('No message content found');
        return;
      }
      
      // Don't process bot messages or system messages
      if (this.isBotMessage(message)) {
        console.log('Bot message detected, skipping');
        return;
      }
      
      console.log('Generating replies for locked message:', message.content);
      
      // Show loading indicator
      console.log('Showing loading preview');
      this.showLoadingPreview(messageElement);
      
      // Generate multiple replies
      console.log('Generating multiple replies');
      await this.generateMultipleReplies(message, messageElement);
    } else {
      console.log('No locked message or different message, skipping reply generation');
      // Just set as hovered for potential locking
      this.hoveredMessage = messageElement;
    }
  }

  async handleMessageLeave(event, messageElement) {
    // Completely disable mouse leave behavior
    // Do nothing - no hiding, no generating replies
    console.log('Mouse leave detected - ignoring');
  }

  extractMessages(element) {
    const messages = [];
    
    // Look for message elements
    const messageElements = element.querySelectorAll('[class*="message"]') || 
                           element.querySelectorAll('[data-message-id]') ||
                           (element.matches('[class*="message"]') ? [element] : []);

    for (const msgElement of messageElements) {
      const message = this.parseMessageElement(msgElement);
      if (message) {
        messages.push(message);
      }
    }

    return messages;
  }

  parseMessageElement(element) {
    try {
      console.log('Parsing message element:', element);
      
      // Extract message ID
      const messageId = element.getAttribute('data-message-id') || 
                       element.id ||
                       this.generateMessageId();

      // Extract message content - try multiple selectors
      let contentElement = element.querySelector('[class*="messageContent"]') ||
                          element.querySelector('[class*="markup"]') ||
                          element.querySelector('div[class*="message"]');
      
      // If no content element found, try getting text from the element itself
      if (!contentElement) {
        contentElement = element;
      }
      
      let content = contentElement ? contentElement.textContent.trim() : '';
      
      // If still no content, try innerText
      if (!content) {
        content = element.innerText ? element.innerText.trim() : '';
      }
      
      // Clean up the content to remove Discord-specific elements
      if (content) {
        // Remove author name and timestamp if present
        content = content.replace(/^[^:]+:\s*/, ''); // Remove "Username: "
        content = content.replace(/^\d{1,2}:\d{2}\s*(AM|PM)?\s*/, ''); // Remove timestamp
        
        // Remove Discord mentions/tags that appear at the beginning
        // This handles cases like "@username hello there" -> "hello there"
        content = content.replace(/^@[^\s]+\s+/, ''); // Remove @username at start
        
        // Remove any remaining Discord mention patterns
        content = content.replace(/@[^\s]+/g, ''); // Remove all @mentions
        
        // Clean up extra whitespace
        content = content.replace(/\s+/g, ' ').trim();
        
        // If content is now empty or just whitespace, try alternative extraction
        if (!content || content.length < 2) {
          console.log('Content too short after cleaning, trying alternative extraction...');
          content = this.extractContentAlternative(element);
        }
      }
      
      console.log('Extracted content:', content);
      
      // Extract author info
      const authorElement = element.querySelector('[class*="username"]') ||
                           element.querySelector('[class*="author"]');
      
      const author = authorElement ? authorElement.textContent.trim() : 'Unknown';

      // Check if it's a webhook message (usually has a bot tag or specific styling)
      const isWebhook = element.querySelector('[class*="botTag"]') ||
                       element.querySelector('[class*="webhook"]') ||
                       author.includes('BOT') ||
                       element.getAttribute('data-author-type') === 'webhook';

      return {
        id: messageId,
        content: content,
        author: author,
        isWebhook: isWebhook,
        element: element,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error parsing message element:', error);
      return null;
    }
  }

  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  extractContentAlternative(element) {
    try {
      console.log('Trying alternative content extraction...');
      
      // Try to find the actual message content by looking for specific Discord classes
      const messageContentSelectors = [
        '[class*="messageContent"]',
        '[class*="markup"]',
        '[class*="messageText"]',
        '[class*="content"]',
        'div[class*="message"] > div:not([class*="header"])',
        'div[class*="message"] > div:not([class*="username"])',
        'div[class*="message"] > div:not([class*="timestamp"])'
      ];
      
      for (const selector of messageContentSelectors) {
        const contentEl = element.querySelector(selector);
        if (contentEl) {
          let text = contentEl.textContent || contentEl.innerText || '';
          text = text.trim();
          
          // Clean the text
          text = text.replace(/^[^:]+:\s*/, ''); // Remove "Username: "
          text = text.replace(/^\d{1,2}:\d{2}\s*(AM|PM)?\s*/, ''); // Remove timestamp
          text = text.replace(/@[^\s]+/g, ''); // Remove @mentions
          text = text.replace(/\s+/g, ' ').trim();
          
          if (text && text.length > 1) {
            console.log('Alternative extraction found content:', text);
            return text;
          }
        }
      }
      
      // Last resort: get all text and try to extract meaningful content
      const allText = element.textContent || element.innerText || '';
      const lines = allText.split('\n').map(line => line.trim()).filter(line => line);
      
      // Look for lines that don't look like usernames, timestamps, or mentions
      for (const line of lines) {
        if (line.length > 1 && 
            !line.match(/^\d{1,2}:\d{2}/) && // Not a timestamp
            !line.match(/^@[^\s]+$/) && // Not just a mention
            !line.match(/^[A-Za-z0-9_]+$/) && // Not just a username
            line.includes(' ')) { // Has spaces (likely actual message content)
          console.log('Found meaningful line:', line);
          return line;
        }
      }
      
      console.log('No meaningful content found in alternative extraction');
      return '';
    } catch (error) {
      console.error('Error in alternative content extraction:', error);
      return '';
    }
  }

  isBotMessage(message) {
    // Check if the message is from a bot or webhook
    return message.isWebhook || 
           message.author.toLowerCase().includes('bot') ||
           message.author.toLowerCase().includes('webhook') ||
           message.author.toLowerCase().includes('dobby');
  }

  showLoadingPreview(messageElement) {
    console.log('showLoadingPreview called');
    
    // Remove existing preview
    this.hideReplyPreview(messageElement);
    
    // Create Discord-style loading dropdown positioned in top right of Discord UI
    const dropdown = document.createElement('div');
    console.log('Creating dropdown element');
    dropdown.className = 'discord-reply-dropdown';
    dropdown.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #2f3136 0%, #36393f 100%);
      border: 1px solid #5865f2;
      border-radius: 12px;
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(88, 101, 242, 0.1);
      z-index: 9999;
      min-width: 380px;
      max-width: 500px;
      font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      animation: discordSlideIn 0.2s ease-out;
      backdrop-filter: blur(10px);
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid rgba(88, 101, 242, 0.2);
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(90deg, rgba(88, 101, 242, 0.1) 0%, transparent 100%);
    `;
    
    const icon = document.createElement('img');
    icon.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    `;
    icon.src = chrome.runtime.getURL('dobby.png');
    console.log('Loading icon from:', icon.src);
    
    // Add error handling for image loading
    icon.onerror = () => {
      console.log('Failed to load dobby.png, falling back to emoji');
      icon.style.display = 'none';
      const fallbackIcon = document.createElement('div');
      fallbackIcon.style.cssText = `
        width: 60px;
        height: 60px;
        background: #5865f2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
      `;
      fallbackIcon.textContent = '🤖';
      icon.parentNode.replaceChild(fallbackIcon, icon);
    };
    
    icon.onload = () => {
      console.log('Successfully loaded dobby.png');
    };
    icon.alt = 'Dobby AI';
    
    const title = document.createElement('div');
    title.style.cssText = `
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      letter-spacing: 0.5px;
    `;
    title.textContent = 'Dobby AI Replies';
    
    header.appendChild(icon);
    header.appendChild(title);
    
    // Create loading content
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 12px 16px;
      color: #dcddde;
      font-size: 14px;
      line-height: 1.375;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const loadingDots = document.createElement('div');
    loadingDots.style.cssText = `
      display: flex;
      gap: 4px;
    `;
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 6px;
        height: 6px;
        background: #5865f2;
        border-radius: 50%;
        animation: loadingDot 1.4s infinite ease-in-out;
        animation-delay: ${i * 0.16}s;
      `;
      loadingDots.appendChild(dot);
    }
    
    const loadingText = document.createElement('span');
    loadingText.textContent = 'Generating reply...';
    
    content.appendChild(loadingDots);
    content.appendChild(loadingText);
    
    // Assemble dropdown
    dropdown.appendChild(header);
    dropdown.appendChild(content);
    
    // Add loading animation styles
    if (!document.getElementById('discord-bot-styles')) {
      const style = document.createElement('style');
      style.id = 'discord-bot-styles';
      style.textContent = `
        @keyframes discordSlideIn {
          from { 
            opacity: 0; 
            transform: translateY(-8px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        @keyframes loadingDot {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .discord-reply-dropdown {
          pointer-events: auto;
        }
        .discord-reply-dropdown button:hover {
          background-color: #4752c4 !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Append to body instead of message element
    console.log('Appending dropdown to body');
    document.body.appendChild(dropdown);
    
    // Add click outside to close functionality
    this.addClickOutsideListener(dropdown);
    
    // Add escape key to close functionality
    this.addEscapeKeyListener(dropdown);
    
    // Add keyboard shortcuts
    this.addKeyboardShortcuts();
    
    this.replyPreview = {
      element: dropdown,
      messageElement: messageElement
    };
    console.log('Loading preview created and added to DOM');
  }

  showReplyPreview(messageElement, replies) {
    console.log('showReplyPreview called with replies:', replies);
    
    // Remove existing preview
    this.hideReplyPreview(messageElement);
    
    // Create Discord-style dropdown positioned in top right of Discord UI
    const dropdown = document.createElement('div');
    console.log('Creating reply dropdown element');
    dropdown.className = 'discord-reply-dropdown';
    dropdown.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #2f3136 0%, #36393f 100%);
      border: 1px solid #5865f2;
      border-radius: 12px;
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(88, 101, 242, 0.1);
      z-index: 9999;
      min-width: 380px;
      max-width: 500px;
      font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      animation: discordSlideIn 0.2s ease-out;
      backdrop-filter: blur(10px);
    `;
    
    // Create header with lock button
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px 8px 16px;
      border-bottom: 1px solid #202225;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: move;
      user-select: none;
    `;
    
    const icon = document.createElement('img');
    icon.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    `;
    icon.src = chrome.runtime.getURL('dobby.png');
    console.log('Loading icon from:', icon.src);
    
    // Add error handling for image loading
    icon.onerror = () => {
      console.log('Failed to load dobby.png, falling back to emoji');
      icon.style.display = 'none';
      const fallbackIcon = document.createElement('div');
      fallbackIcon.style.cssText = `
        width: 60px;
        height: 60px;
        background: #5865f2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
      `;
      fallbackIcon.textContent = '🤖';
      icon.parentNode.replaceChild(fallbackIcon, icon);
    };
    
    icon.onload = () => {
      console.log('Successfully loaded dobby.png');
    };
    icon.alt = 'Dobby AI';
    
    const title = document.createElement('div');
    title.style.cssText = `
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      flex: 1;
    `;
    title.textContent = 'Dobby AI Replies';
    
    const lockButton = document.createElement('button');
    lockButton.style.cssText = `
      background: ${this.lockedChat === messageElement ? '#3ba55c' : '#5865f2'};
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.17s ease;
      font-family: inherit;
    `;
    lockButton.textContent = this.lockedChat === messageElement ? '🔒 Locked' : '🔓 Lock';
    
    lockButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.lockedChat === messageElement) {
        // Unlock
        this.lockedChat = null;
        this.lockedMessage = null;
        lockButton.textContent = '🔓 Lock';
        lockButton.style.background = '#5865f2';
      } else {
        // Lock to this chat
        this.lockedChat = messageElement;
        this.lockedMessage = messageElement;
        lockButton.textContent = '🔒 Locked';
        lockButton.style.background = '#3ba55c';
      }
    });
    
    const dragHandle = document.createElement('div');
    dragHandle.style.cssText = `
      color: #72767d;
      font-size: 12px;
      cursor: move;
    `;
    dragHandle.textContent = '⋮⋮';
    
    // Add regenerate button
    const regenerateButton = document.createElement('button');
    regenerateButton.style.cssText = `
      background: #5865f2;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.17s ease;
      font-family: inherit;
      margin-right: 8px;
    `;
    regenerateButton.textContent = '🔄 Regenerate';
    
    regenerateButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Regenerate button clicked');
      
      // Hide current preview
      this.hideReplyPreview(messageElement);
      
      // Parse the message again to get fresh content
      const message = this.parseMessageElement(messageElement);
      console.log('Regenerating for message:', message);
      
      if (message && message.content && message.content.trim()) {
        // Show loading and regenerate replies
        this.showLoadingPreview(messageElement);
        this.generateMultipleReplies(message, messageElement);
      } else {
        // Try fallback content extraction
        const fallbackContent = this.extractContentFallback(messageElement);
        if (fallbackContent && fallbackContent.trim()) {
          const fallbackMessage = {
            id: this.generateMessageId(),
            content: fallbackContent,
            author: 'Unknown',
            isWebhook: false
          };
          this.showLoadingPreview(messageElement);
          this.generateMultipleReplies(fallbackMessage, messageElement);
        } else {
          this.showNotification('⚠️ No message content found for regeneration');
        }
      }
    });

    header.appendChild(icon);
    header.appendChild(title);
    header.appendChild(regenerateButton);
    header.appendChild(lockButton);
    header.appendChild(dragHandle);
    
    // Create content with multiple replies
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 12px 16px;
      max-height: 300px;
      overflow-y: auto;
    `;
    
    replies.forEach((reply, index) => {
      const replyContainer = document.createElement('div');
      replyContainer.style.cssText = `
        margin-bottom: 16px;
        padding: 16px;
        background: linear-gradient(135deg, #36393f 0%, #40444b 100%);
        border-radius: 10px;
        border: 1px solid rgba(88, 101, 242, 0.2);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
      `;
      
      const replyText = document.createElement('div');
      replyText.style.cssText = `
        color: #dcddde;
        font-size: 13px;
        line-height: 1.4;
        word-wrap: break-word;
        margin-bottom: 8px;
      `;
      replyText.textContent = reply;
      
      const copyButton = document.createElement('button');
      copyButton.style.cssText = `
        background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
        box-shadow: 0 2px 4px rgba(88, 101, 242, 0.3);
      `;
      copyButton.textContent = `Copy Reply ${index + 1}`;
      
      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(reply).then(() => {
          copyButton.textContent = 'Copied!';
          copyButton.style.background = '#3ba55c';
          setTimeout(() => {
            copyButton.textContent = `Copy Reply ${index + 1}`;
            copyButton.style.background = '#5865f2';
          }, 1500);
        });
      });
      
      
      replyContainer.appendChild(replyText);
      replyContainer.appendChild(copyButton);
      content.appendChild(replyContainer);
    });
    
    // Assemble dropdown
    dropdown.appendChild(header);
    dropdown.appendChild(content);
    
    // Make draggable
    this.makeDraggable(dropdown, header);
    
    // Add animation styles
    if (!document.getElementById('discord-bot-styles')) {
      const style = document.createElement('style');
      style.id = 'discord-bot-styles';
      style.textContent = `
        @keyframes discordSlideIn {
          from { 
            opacity: 0; 
            transform: translateY(-8px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        .discord-reply-dropdown {
          pointer-events: auto;
        }
        .discord-reply-dropdown button:hover {
          background-color: #4752c4 !important;
        }
        .discord-reply-dropdown button:active {
          transform: scale(0.98);
        }
      `;
      document.head.appendChild(style);
    }
    
    // Append to body instead of message element
    document.body.appendChild(dropdown);
    
    // Add click outside to close functionality
    this.addClickOutsideListener(dropdown);
    
    // Add escape key to close functionality
    this.addEscapeKeyListener(dropdown);
    
    this.replyPreview = {
      element: dropdown,
      messageElement: messageElement
    };
    console.log('Reply preview created and added to DOM with', replies.length, 'replies');
  }

  hideReplyPreview(messageElement) {
    const existingPreview = document.querySelector('.discord-reply-dropdown');
    if (existingPreview) {
      existingPreview.remove();
    }
    this.replyPreview = null;
  }

  makeDraggable(element, handle) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    handle.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === handle || handle.contains(e.target)) {
        isDragging = true;
        element.style.cursor = 'grabbing';
        element.style.zIndex = '1001';
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        element.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    }

    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      element.style.cursor = 'default';
      element.style.zIndex = '1000';
    }
  }

  addClickOutsideListener(dropdown) {
    const clickOutsideHandler = (event) => {
      if (!dropdown.contains(event.target)) {
        console.log('Click outside detected, removing dropdown');
        dropdown.remove();
        this.replyPreview = null;
        document.removeEventListener('click', clickOutsideHandler);
      }
    };
    
    // Increase delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', clickOutsideHandler);
    }, 1000);
  }

  addEscapeKeyListener(dropdown) {
    const escapeKeyHandler = (event) => {
      if (event.key === 'Escape') {
        dropdown.remove();
        this.replyPreview = null;
        document.removeEventListener('keydown', escapeKeyHandler);
      }
    };
    
    document.addEventListener('keydown', escapeKeyHandler);
  }

  showNotification(message) {
    // Remove existing notification
    const existing = document.querySelector('.discord-bot-notification');
    if (existing) {
      existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'discord-bot-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #5865f2;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideInDown 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  addKeyboardShortcuts() {
    // Add global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts if not in an input field
      const isInputField = e.target.tagName === 'INPUT' || 
                          e.target.tagName === 'TEXTAREA' || 
                          e.target.contentEditable === 'true' ||
                          e.target.getAttribute('data-slate-editor') === 'true';
      
      if (isInputField) {
        return; // Don't interfere with input fields
      }
      
      // Ctrl+L to lock to current message
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        if (this.hoveredMessage) {
          this.lockToMessage(this.hoveredMessage);
        }
      }
      
      // Ctrl+U to unlock
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        this.unlockMessage();
      }
    });
  }

  typeReplyInDiscord(reply) {
    console.log('Typing reply in Discord:', reply);
    
    // Find Discord's message input area
    const messageInputSelectors = [
      '[data-slate-editor="true"]',
      '[class*="textArea"]',
      '[class*="messageInput"]',
      '[class*="slateTextArea"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]'
    ];
    
    let messageInput = null;
    
    // Try each selector
    for (const selector of messageInputSelectors) {
      messageInput = document.querySelector(selector);
      if (messageInput) {
        console.log('Found message input with selector:', selector);
        break;
      }
    }
    
    if (messageInput) {
      console.log('Found message input, attempting to type reply:', reply);
      
      // Focus the input first
      messageInput.focus();
      
      // Try to use Discord's internal methods if available
      if (messageInput.setValue && typeof messageInput.setValue === 'function') {
        console.log('Using Discord setValue method');
        messageInput.setValue(reply);
        this.showNotification('✅ Reply typed in Discord input');
        return;
      }
      
      // Fallback: Use document.execCommand for better compatibility
      try {
        // Select all existing content
        messageInput.select();
        document.execCommand('selectAll');
        
        // Delete selected content
        document.execCommand('delete');
        
        // Insert the new text
        document.execCommand('insertText', false, reply);
        
        console.log('Successfully typed reply using execCommand');
        this.showNotification('✅ Reply typed in Discord input');
        
      } catch (error) {
        console.log('execCommand failed, trying direct method:', error);
        
        // Last resort: Direct text setting
        messageInput.textContent = reply;
        messageInput.innerText = reply;
        
        // Trigger a simple input event
        const event = new Event('input', { bubbles: true });
        messageInput.dispatchEvent(event);
        
        console.log('Successfully typed reply using direct method');
        this.showNotification('✅ Reply typed in Discord input');
      }
    } else {
      console.log('Could not find Discord message input');
      this.showNotification('⚠️ Could not find Discord input area');
    }
  }

  extractContentFallback(element) {
    // Try to get all text content from the element
    let content = element.textContent || element.innerText || '';
    
    // Remove common Discord UI elements
    const unwantedSelectors = [
      '[class*="timestamp"]',
      '[class*="username"]',
      '[class*="author"]',
      '[class*="botTag"]',
      '[class*="reaction"]',
      '[class*="embed"]',
      '[class*="attachment"]'
    ];
    
    unwantedSelectors.forEach(selector => {
      const unwantedElements = element.querySelectorAll(selector);
      unwantedElements.forEach(el => {
        content = content.replace(el.textContent, '');
      });
    });
    
    // Clean up the content
    content = content.trim();
    content = content.replace(/\s+/g, ' '); // Replace multiple spaces with single space
    content = content.replace(/^[^:]+:\s*/, ''); // Remove "Username: " prefix
    
    return content;
  }

  isContentAppropriate(content) {
    // Only filter out the absolute worst words
    const extremeInappropriateWords = [
      'nigger', 'fag', 'retard', 'whore', 'slut', 'cunt'
    ];
    
    // Convert to lowercase for comparison
    const lowerContent = content.toLowerCase();
    
    // Check for extreme inappropriate words only
    for (const word of extremeInappropriateWords) {
      if (lowerContent.includes(word)) {
        console.log('Filtered extreme inappropriate content:', content);
        return false;
      }
    }
    
    // Filter out empty or meaningless content
    const trimmedContent = content.trim();
    
    // Filter empty content
    if (!trimmedContent || trimmedContent.length < 2) {
      console.log('Filtered empty/short content:', content);
      return false;
    }
    
    // Filter out empty quotes and similar meaningless patterns
    const meaninglessPatterns = [
      '""', "''", '""', "''", // Empty quotes
      '...', '...', // Just dots
      '???', '!!!', // Just punctuation
      'ok', 'okay', 'yes', 'no', 'yeah', 'nah', // Single word responses
      'lol', 'haha', 'hehe', // Just laughter
      'idk', 'idc', 'tbh', 'imo', // Abbreviations
      'wtf', 'omg', 'lmao', 'rofl' // Exclamations
    ];
    
    for (const pattern of meaninglessPatterns) {
      if (trimmedContent.toLowerCase() === pattern) {
        console.log('Filtered meaningless content:', content);
        return false;
      }
    }
    
    // Filter content that's mostly punctuation or special characters
    const meaningfulChars = trimmedContent.replace(/[^\w\s]/g, '').trim();
    if (meaningfulChars.length < 2) {
      console.log('Filtered content with too little meaningful text:', content);
      return false;
    }
    
    // Filter content that's just repeated characters
    if (trimmedContent.match(/^(.)\1{2,}$/)) {
      console.log('Filtered repeated character content:', content);
      return false;
    }
    
    return true;
  }

  async generateMultipleReplies(message, messageElement) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const config = await this.loadConfig();
      
      if (!config.botEnabled || !config.fireworksApiKey) {
        this.hideReplyPreview(messageElement);
        return;
      }

      // Generate 3 different replies with different prompts
      const prompts = [
        `Reply to: "${message.content}" - give a short, friendly response. Be conversational and helpful. Don't wrap your response in quotes.`,
        `Someone said: "${message.content}" - respond naturally and briefly. Give a meaningful reply that adds to the conversation. No quotes around your response.`,
        `Answer this: "${message.content}" - keep it simple and polite. Provide a genuine response without quotation marks.`
      ];

      const replies = [];
      let attempts = 0;
      const maxAttempts = 6; // Try up to 6 times to get 3 good replies
      
      while (replies.length < 3 && attempts < maxAttempts) {
        const promptIndex = attempts % 3; // Cycle through the 3 prompts
        const reply = await this.generateReplyWithPrompt(prompts[promptIndex], config);
        
        if (reply && this.isContentAppropriate(reply)) {
          // Remove quotes from the reply if they wrap the entire content
          let cleanReply = reply.trim();
          
          // Remove surrounding quotes (both single and double)
          if ((cleanReply.startsWith('"') && cleanReply.endsWith('"')) ||
              (cleanReply.startsWith("'") && cleanReply.endsWith("'"))) {
            cleanReply = cleanReply.slice(1, -1).trim();
          }
          
          // Check if this reply is different from existing ones
          const isDuplicate = replies.some(existingReply => 
            existingReply.toLowerCase().trim() === cleanReply.toLowerCase().trim()
          );
          
          if (!isDuplicate && cleanReply.length > 0) {
            replies.push(cleanReply);
            console.log(`Generated reply ${replies.length}: ${cleanReply}`);
          } else {
            console.log('Skipped duplicate or empty reply:', cleanReply);
          }
        } else {
          console.log('Filtered inappropriate reply:', reply);
        }
        
        attempts++;
      }
      
      if (replies.length > 0) {
        console.log(`Showing ${replies.length} replies:`, replies);
        this.showReplyPreview(messageElement, replies);
      } else {
        console.log('No valid replies generated, showing fallback replies');
        // Show some basic fallback replies that are more meaningful
        const fallbackReplies = [
          'That sounds interesting',
          'I see what you mean',
          'Thanks for sharing that'
        ];
        this.showReplyPreview(messageElement, fallbackReplies);
      }
      
    } catch (error) {
      console.error('Error generating replies:', error);
      this.hideReplyPreview(messageElement);
    } finally {
      this.isProcessing = false;
    }
  }


  async generateReplyWithPrompt(prompt, config) {
    try {
      // Use background script to avoid CORS issues
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'generateReply',
          message: prompt,
          config: config
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            resolve(null);
            return;
          }
          
          if (response && response.success) {
            resolve(response.reply);
          } else {
            console.error('Error generating reply:', response?.error);
            resolve(null);
          }
        });
      });
      
    } catch (error) {
      console.error('Error generating reply:', error);
      return null;
    }
  }

  async generateReply(messageContent, config) {
    try {
      // Use background script to avoid CORS issues
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'generateReply',
          message: messageContent,
          config: config
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            resolve(null);
            return;
          }
          
          if (response && response.success) {
            resolve(response.reply);
          } else {
            console.error('Error generating reply:', response?.error);
            resolve(null);
          }
        });
      });
      
    } catch (error) {
      console.error('Error generating reply:', error);
      return null;
    }
  }


  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup method to prevent memory leaks
  cleanup() {
    console.log('Cleaning up DiscordHoverBot...');
    
    // Clear timeouts
    if (this.observerTimeout) {
      clearTimeout(this.observerTimeout);
      this.observerTimeout = null;
    }
    
    // Disconnect observer
    if (this.messageObserver) {
      this.messageObserver.disconnect();
      this.messageObserver = null;
    }
    
    // Remove event listeners
    this.eventListeners.forEach(listener => {
      if (listener.element && listener.event && listener.handler) {
        listener.element.removeEventListener(listener.event, listener.handler);
      }
    });
    this.eventListeners.clear();
    
    // Hide any active previews
    this.hideReplyPreview();
    
    // Clear references
    this.hoveredMessage = null;
    this.lockedChat = null;
    this.lockedMessage = null;
    this.replyPreview = null;
  }
}

// Initialize the bot when the page loads (prevent multiple instances)
if (!window.discordBotInitialized) {
  window.discordBotInitialized = true;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new DiscordHoverBot();
    });
  } else {
    new DiscordHoverBot();
  }
}
