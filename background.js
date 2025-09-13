// Dobby AI - Background Script
console.log('Dobby AI: Background script loaded');

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  // Validate request structure
  if (!request || !request.action) {
    sendResponse({ success: false, error: 'Invalid request format' });
    return;
  }

  switch (request.action) {
    case 'testConnection':
      if (!request.config || !request.config.fireworksApiKey) {
        sendResponse({ success: false, error: 'Missing API key configuration' });
        return;
      }
      testConnection(request.config)
        .then(result => sendResponse(result))
        .catch(error => {
          console.error('Test connection error:', error);
          sendResponse({ success: false, error: error.message || 'Connection test failed' });
        });
      return true; // Keep message channel open for async response

    case 'generateReply':
      if (!request.message || !request.config || !request.config.fireworksApiKey) {
        sendResponse({ success: false, error: 'Missing message or API key configuration' });
        return;
      }
      generateReply(request.message, request.config)
        .then(result => sendResponse(result))
        .catch(error => {
          console.error('Generate reply error:', error);
          sendResponse({ success: false, error: error.message || 'Reply generation failed' });
        });
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action: ' + request.action });
  }
});

// Test connection to Fireworks API
async function testConnection(config) {
  try {
    console.log('Dobby AI: Testing Fireworks API connection...');
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.fireworksApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b',
        messages: [
          {
            role: 'user',
            content: 'Hello! This is a test message. Please respond with "Connection successful!"'
          }
        ],
        max_tokens: 25,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fireworks API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content;

    if (!reply) {
      throw new Error('No response received from Fireworks API');
    }

    console.log('Fireworks API test successful:', reply);

    return { 
      success: true, 
      message: 'Fireworks API is working correctly!' 
    };

  } catch (error) {
    console.error('Connection test failed:', error);
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        error: 'Connection timeout - please check your internet connection' 
      };
    } else if (error.message.includes('Failed to fetch')) {
      return { 
        success: false, 
        error: 'Network error - please check your internet connection' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Connection test failed' 
    };
  }
}

// Generate reply using Fireworks API
async function generateReply(messageContent, config) {
  try {
    console.log('Dobby AI: Generating reply for message:', messageContent);
    
    const prompt = messageContent;
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for generation
    
    const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.fireworksApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 25,
        temperature: 0.8,
        top_p: 0.95,
        frequency_penalty: 0.3,
        presence_penalty: 0.2
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fireworks API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error('No reply generated from Fireworks API');
    }

    console.log('Generated reply:', reply);
    return { success: true, reply: reply };

  } catch (error) {
    console.error('Error generating reply:', error);
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        error: 'Reply generation timeout - please try again' 
      };
    } else if (error.message.includes('Failed to fetch')) {
      return { 
        success: false, 
        error: 'Network error - please check your internet connection' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Reply generation failed' 
    };
  }
}


// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Discord Hover Reply Bot installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default configuration
    chrome.storage.sync.set({
      botEnabled: false,
      replyPrompt: 'Respond naturally and conversationally to this message as if you\'re a real person having a casual chat. Be helpful but keep it human and relatable. Don\'t use emojis or overly formal language. Message: {message}'
    });
  }
});

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('discord.com')) {
    console.log('Discord tab updated, ensuring content script is active');
    
    // Check if content script is already injected
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        return typeof window.DiscordHoverBot !== 'undefined';
      }
    }).then((results) => {
      if (!results[0]?.result) {
        console.log('Content script not found, injecting...');
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
      }
    }).catch((error) => {
      console.error('Error checking/injecting content script:', error);
    });
  }
});
